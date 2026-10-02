import { and, eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { userNotes, userRatings } from '../schema';
import { markDataChanged } from '../../backup/changeFeed';

// Watch marks: a rating, a date and a review each. A title's rating is its
// latest rated mark's, mirrored in user_ratings for everything that reads it.

export interface MarkInput {
  rating: number | null;
  body: string;
  markedAt: number;
}

const listeners = new Set<(titleId: string) => void>();

/** Immediate (unlike the backup feed): screens showing a title's marks reload. */
export function onMarksChanged(fn: (titleId: string) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Newest mark first. */
export async function getNotesForTitle(titleId: string) {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(userNotes)
    .where(eq(userNotes.titleId, titleId));
  return rows
    .map(r => ({ ...r, markedAt: r.markedAt ?? r.createdAt }))
    .sort((a, b) => b.markedAt - a.markedAt || b.id - a.id);
}

/** Mirrors the latest rated mark into user_ratings; `changedAt` dates the change. */
async function syncRating(titleId: string, changedAt: number) {
  const latest = (await getNotesForTitle(titleId)).find(m => m.rating != null);
  await db.delete(userRatings).where(eq(userRatings.titleId, titleId));
  if (latest)
    await db.insert(userRatings).values({
      titleId,
      rating: latest.rating!,
      reviewText: latest.body || null,
      createdAt: latest.createdAt,
      updatedAt: changedAt,
    });
}

async function changed(titleId: string, at = Date.now()) {
  markDataChanged();
  await syncRating(titleId, at);
  listeners.forEach(fn => fn(titleId));
}

export async function addMark(
  titleId: string,
  { rating, body, markedAt }: MarkInput,
  changedAt?: number,
) {
  await ensureMigrated();
  const now = Date.now();
  await db.insert(userNotes).values({
    titleId,
    rating,
    body,
    markedAt,
    createdAt: changedAt ?? now,
    updatedAt: changedAt ?? now,
  });
  await changed(titleId, changedAt);
}

export async function updateMark(
  id: number,
  { rating, body, markedAt }: MarkInput,
) {
  await ensureMigrated();
  const [row] = await db.select().from(userNotes).where(eq(userNotes.id, id));
  if (!row) return;
  await db
    .update(userNotes)
    .set({ rating, body, markedAt, updatedAt: Date.now() })
    .where(eq(userNotes.id, id));
  await changed(row.titleId);
}

export async function deleteMark(id: number) {
  await ensureMigrated();
  const [row] = await db.select().from(userNotes).where(eq(userNotes.id, id));
  if (!row) return;
  await db.delete(userNotes).where(eq(userNotes.id, id));
  await changed(row.titleId);
}

/**
 * An imported rating as a mark, unless the same one is there (a re-import).
 * A same-dated mark with the same rating and the plain review gets the
 * season-labelled one instead. Returns true if anything was written.
 */
export async function importMark(
  titleId: string,
  mark: MarkInput & { rating: number },
  plainBody: string,
): Promise<boolean> {
  await ensureMigrated();
  const same = (await getNotesForTitle(titleId)).filter(
    m => m.markedAt === mark.markedAt && m.rating === mark.rating,
  );
  if (same.some(m => m.body === mark.body)) return false;
  const plain = same.find(m => m.body === plainBody || m.body === '');
  if (plain)
    await db
      .update(userNotes)
      .set({ body: mark.body })
      .where(and(eq(userNotes.id, plain.id)));
  else
    await db.insert(userNotes).values({
      titleId,
      ...mark,
      createdAt: mark.markedAt,
      updatedAt: mark.markedAt,
    });
  await changed(titleId, mark.markedAt);
  return !plain;
}

export async function getAllNotes() {
  await ensureMigrated();
  return db.select().from(userNotes);
}
