import { eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { userRatings } from '../schema';
import { markDataChanged } from '../../backup/changeFeed';

export async function getUserRatingForTitle(titleId: string) {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(userRatings)
    .where(eq(userRatings.titleId, titleId))
    .limit(1);
  return rows[0];
}

export async function setUserRating(
  titleId: string,
  rating: number,
  reviewText?: string,
) {
  markDataChanged();
  await ensureMigrated();
  const existing = await getUserRatingForTitle(titleId);
  const now = Date.now();
  if (existing) {
    await db
      .update(userRatings)
      .set({ rating, reviewText, updatedAt: now })
      .where(eq(userRatings.id, existing.id));
  } else {
    await db.insert(userRatings).values({
      titleId,
      rating,
      reviewText,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getAllUserRatings() {
  await ensureMigrated();
  return db.select().from(userRatings);
}

/** Adds an imported rating unless the title is already rated. Returns true if written. */
export async function importRating(
  titleId: string,
  rating: number,
  reviewText: string | undefined,
  at: number,
): Promise<boolean> {
  markDataChanged();
  if (await getUserRatingForTitle(titleId)) return false;
  await db.insert(userRatings).values({
    titleId,
    rating,
    reviewText,
    createdAt: at,
    updatedAt: at,
  });
  return true;
}
