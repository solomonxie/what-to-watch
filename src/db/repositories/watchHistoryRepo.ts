import { desc, eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { watchHistory } from '../schema';
import type { WatchStatus } from '../../types/domain';

export async function recordWatch(titleId: string, status: WatchStatus) {
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

const STATUS_RANK: Record<string, number> = {
  toWatch: 0,
  watching: 1,
  dropped: 1,
  completed: 2,
};

/** Adds an imported entry; never downgrades what's already recorded. Returns true if written. */
export async function importWatch(
  titleId: string,
  status: WatchStatus,
  watchedAt: number,
): Promise<boolean> {
  const existing = await getWatchEntry(titleId);
  if (existing && STATUS_RANK[existing.status] >= STATUS_RANK[status])
    return false;
  const rewatchCount =
    status === 'completed' ? Math.max(1, existing?.rewatchCount ?? 0) : 0;
  if (existing) {
    await db
      .update(watchHistory)
      .set({ status, watchedAt, rewatchCount })
      .where(eq(watchHistory.id, existing.id));
  } else {
    await db
      .insert(watchHistory)
      .values({ titleId, status, watchedAt, rewatchCount });
  }
  return true;
}
