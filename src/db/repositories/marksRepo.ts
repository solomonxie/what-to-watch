import { eq, inArray } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { marks } from '../schema';
import { markDataChanged } from '../../backup/changeFeed';
import { newestFirst, type Mark, type MarkStatus } from '../../marks/derive';

export interface MarkInput {
  season?: number | null;
  episode?: number | null;
  status?: MarkStatus | null;
  rating?: number | null;
  review?: string;
  markedAt: number;
}

const listeners = new Set<(titleId: string) => void>();

/** Immediate (unlike the backup feed): screens showing a title reload. */
export function onMarksChanged(fn: (titleId: string) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function changed(titleId: string) {
  markDataChanged();
  listeners.forEach(fn => fn(titleId));
}

const row = (titleId: string, m: MarkInput, at: number) => ({
  titleId,
  season: m.season ?? null,
  episode: m.season == null ? null : m.episode ?? null,
  status: m.status ?? null,
  rating: m.rating ?? null,
  review: m.review ?? '',
  markedAt: m.markedAt,
  createdAt: at,
  updatedAt: at,
});

/** Newest first. */
export async function getMarksForTitle(titleId: string): Promise<Mark[]> {
  await ensureMigrated();
  const rows = await db.select().from(marks).where(eq(marks.titleId, titleId));
  return rows.sort(newestFirst);
}

export async function getAllMarks(): Promise<Mark[]> {
  await ensureMigrated();
  return db.select().from(marks);
}

export async function addMarks(
  titleId: string,
  inputs: MarkInput[],
  at = Date.now(),
) {
  await ensureMigrated();
  if (inputs.length === 0) return;
  const rows = inputs.map(m => row(titleId, m, at));
  // Under SQLite's bound-variable limit.
  for (let i = 0; i < rows.length; i += 500)
    await db.insert(marks).values(rows.slice(i, i + 500));
  changed(titleId);
}

export async function addMark(titleId: string, input: MarkInput) {
  await addMarks(titleId, [input]);
}

export async function updateMark(id: number, input: MarkInput) {
  await ensureMigrated();
  const [existing] = await db.select().from(marks).where(eq(marks.id, id));
  if (!existing) return;
  const { season, episode, status, rating, review, markedAt } = row(
    existing.titleId,
    input,
    0,
  );
  await db
    .update(marks)
    .set({
      season,
      episode,
      status,
      rating,
      review,
      markedAt,
      updatedAt: Date.now(),
    })
    .where(eq(marks.id, id));
  changed(existing.titleId);
}

/** Changes only the status of the given marks. */
export async function setMarksStatus(
  titleId: string,
  ids: number[],
  status: MarkStatus | null,
) {
  await ensureMigrated();
  if (ids.length === 0) return;
  await db
    .update(marks)
    .set({ status, updatedAt: Date.now() })
    .where(inArray(marks.id, ids));
  changed(titleId);
}

export async function deleteMarks(titleId: string, ids: number[]) {
  await ensureMigrated();
  if (ids.length === 0) return;
  await db.delete(marks).where(inArray(marks.id, ids));
  changed(titleId);
}

export async function deleteMark(id: number) {
  await ensureMigrated();
  const [existing] = await db.select().from(marks).where(eq(marks.id, id));
  if (existing) await deleteMarks(existing.titleId, [id]);
}

/**
 * An imported row as a mark, unless the same one is there (a re-import).
 * A same-dated title-level mark with the same rating and review (left by
 * merging duplicates) moves onto the season instead. Returns true if added.
 */
export async function importMark(
  titleId: string,
  mark: MarkInput,
): Promise<boolean> {
  const season = mark.season ?? null;
  const review = mark.review ?? '';
  const status = mark.status ?? null;
  const same = (await getMarksForTitle(titleId)).filter(
    m =>
      m.episode === null &&
      m.markedAt === mark.markedAt &&
      m.rating === (mark.rating ?? null) &&
      (m.review === review || m.review === ''),
  );
  const existing =
    same.find(m => m.season === season) ??
    (season === null || mark.rating == null
      ? undefined
      : same.find(m => m.season === null && m.status === null));
  if (existing) {
    if (existing.season !== season || (!existing.status && status)) {
      await db
        .update(marks)
        .set({ season, review, status: existing.status ?? status })
        .where(eq(marks.id, existing.id!));
      changed(titleId);
    }
    return false;
  }
  await addMarks(titleId, [mark], mark.markedAt);
  return true;
}
