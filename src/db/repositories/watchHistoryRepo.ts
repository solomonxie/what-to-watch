import { desc, eq } from 'drizzle-orm';
import { db, ensureMigrated, getRawDb } from '../client';
import { DERIVED_STATUS_STATEMENTS } from '../migrations/0005_derived_status';
import { watchHistory } from '../schema';
import type { WatchStatus } from '../../types/domain';
import { markDataChanged } from '../../backup/changeFeed';
import { getUserRatingForTitle } from './ratingsRepo';

export async function recordWatch(titleId: string, status: WatchStatus) {
  markDataChanged();
  await ensureMigrated();
  const existing = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.titleId, titleId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(watchHistory)
      .set({
        status,
        watchedAt: Date.now(),
        rewatchCount:
          existing[0].rewatchCount + (status === 'completed' ? 1 : 0),
      })
      .where(eq(watchHistory.id, existing[0].id));
  } else {
    await db.insert(watchHistory).values({
      titleId,
      status,
      watchedAt: Date.now(),
      rewatchCount: status === 'completed' ? 1 : 0,
    });
  }
}

async function writeStatus(
  titleId: string,
  status: WatchStatus,
  existing?: { id: number; rewatchCount: number; watchedAt: number },
  { keepTime = false } = {},
) {
  markDataChanged();
  const values = {
    status,
    // A status re-derived on viewing isn't the user's change; its date stays.
    watchedAt: keepTime && existing ? existing.watchedAt : Date.now(),
    rewatchCount:
      status === 'completed' ? Math.max(1, existing?.rewatchCount ?? 0) : 0,
  };
  if (existing) {
    await db
      .update(watchHistory)
      .set(values)
      .where(eq(watchHistory.id, existing.id));
  } else {
    await db.insert(watchHistory).values({ titleId, ...values });
  }
}

/** Interested = on the to-watch list; only applies before watching starts. */
export async function setInterested(titleId: string, interested: boolean) {
  markDataChanged();
  await ensureMigrated();
  const existing = await getWatchEntry(titleId);
  if (interested && !existing) await writeStatus(titleId, 'toWatch');
  if (!interested && existing?.status === 'toWatch')
    await db.delete(watchHistory).where(eq(watchHistory.id, existing.id));
}

/** A movie counts as watched once rated. */
export async function markFinished(titleId: string) {
  await ensureMigrated();
  const existing = await getWatchEntry(titleId);
  if (existing?.status === 'completed') return;
  await writeStatus(titleId, 'completed', existing);
}

/** Below this score an unfinished show counts as dropped. */
export const DROP_BELOW = 5;

const isLow = (rating?: number) => rating !== undefined && rating < DROP_BELOW;

/**
 * Show status from episode progress: all aired watched → completed, some →
 * watching, or dropped when scored low. `touch` marks a user action, which
 * also counts as activity; otherwise only a changed status is written.
 */
export async function syncShowProgress(
  titleId: string,
  watchedEpisodes: number,
  airedEpisodes: number,
  { touch = true, rating }: { touch?: boolean; rating?: number } = {},
) {
  await ensureMigrated();
  const existing = await getWatchEntry(titleId);
  if (watchedEpisodes === 0) {
    if (touch && existing && existing.status !== 'toWatch')
      await writeStatus(titleId, 'toWatch', existing);
    return;
  }
  const status: WatchStatus =
    airedEpisodes > 0 && watchedEpisodes >= airedEpisodes
      ? 'completed'
      : isLow(rating)
      ? 'dropped'
      : 'watching';
  if (!touch && existing?.status === status) return;
  await writeStatus(titleId, status, existing, { keepTime: !touch });
}

/** A low score drops a show in progress; raising it picks it back up. */
export async function applyShowRating(titleId: string, rating: number) {
  await ensureMigrated();
  const existing = await getWatchEntry(titleId);
  if (existing?.status === 'watching' && isLow(rating))
    await writeStatus(titleId, 'dropped', existing);
  else if (existing?.status === 'dropped' && !isLow(rating))
    await writeStatus(titleId, 'watching', existing);
}

/** After the rating changed: a rated movie is watched; a show may drop or resume. */
export async function applyRatingToStatus(titleId: string) {
  const rating = (await getUserRatingForTitle(titleId))?.rating;
  if (rating === undefined) return;
  if (titleId.startsWith('movie:')) await markFinished(titleId);
  else await applyShowRating(titleId, rating);
}

export async function getRecentlyWatched(limit = 20) {
  await ensureMigrated();
  return db
    .select()
    .from(watchHistory)
    .orderBy(desc(watchHistory.watchedAt))
    .limit(limit);
}

export async function getAllWatchHistory() {
  await ensureMigrated();
  return db.select().from(watchHistory);
}

export async function getWatchEntry(titleId: string) {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.titleId, titleId))
    .limit(1);
  return rows[0];
}

/** rewatch_count holds the number of completed viewings. */
export async function getWatchCounts(): Promise<Map<string, number>> {
  const rows = await getAllWatchHistory();
  return new Map(rows.map(r => [r.titleId, r.rewatchCount]));
}

/** Writes an imported title's derived status; true if anything changed. */
export async function setImportedStatus(
  titleId: string,
  status: WatchStatus,
  at: number,
): Promise<boolean> {
  markDataChanged();
  const existing = await getWatchEntry(titleId);
  if (existing?.status === status) return false;
  const rewatchCount =
    status === 'completed' ? Math.max(1, existing?.rewatchCount ?? 0) : 0;
  if (existing) {
    await db
      .update(watchHistory)
      .set({ status, rewatchCount })
      .where(eq(watchHistory.id, existing.id));
  } else {
    await db
      .insert(watchHistory)
      .values({ titleId, status, watchedAt: at, rewatchCount });
  }
  return true;
}

/** Applies the derived-status rules to everything stored (e.g. after a restore). */
export async function rederiveStatuses(): Promise<void> {
  await ensureMigrated();
  const raw = getRawDb();
  for (const sql of DERIVED_STATUS_STATEMENTS) await raw.execute(sql);
  markDataChanged();
}
