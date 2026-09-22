import { eq, inArray } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { cachedTitles, cachedRatings, cachedWatchProviders } from '../schema';
import type { NormalizedTitle } from '../../types/domain';

export async function upsertTitle(title: NormalizedTitle): Promise<void> {
  await ensureMigrated();
  await db
    .insert(cachedTitles)
    .values({
      id: title.id,
      tmdbId: title.tmdbId,
      omdbId: title.omdbId,
      imdbId: title.imdbId,
      title: title.title,
      originalTitle: title.originalTitle,
      posterPath: title.posterPath,
      overview: title.overview,
      releaseDate: title.releaseDate,
      genres: title.genres,
      runtimeMinutes: title.runtimeMinutes,
      mediaType: title.mediaType,
      primaryRatingScore: title.primaryRatingScore,
      fetchedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: cachedTitles.id,
      set: {
        title: title.title,
        overview: title.overview,
        posterPath: title.posterPath,
        primaryRatingScore: title.primaryRatingScore,
        fetchedAt: Date.now(),
      },
    });

  if (title.ratings.length > 0) {
    await db.delete(cachedRatings).where(eq(cachedRatings.titleId, title.id));
    await db.insert(cachedRatings).values(
      title.ratings.map(r => ({
        titleId: title.id,
        source: r.source,
        rawValue: r.rawValue,
        scale: r.scale,
        normalizedValue: r.normalizedValue,
        fetchedAt: Date.now(),
      })),
    );
  }
}

export async function getTitleById(id: string) {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(cachedTitles)
    .where(eq(cachedTitles.id, id))
    .limit(1);
  return rows[0];
}

export async function getTitlesByIds(ids: string[]) {
  await ensureMigrated();
  if (ids.length === 0) return [];
  return db.select().from(cachedTitles).where(inArray(cachedTitles.id, ids));
}

export async function getAllCachedTitles() {
  await ensureMigrated();
  return db.select().from(cachedTitles);
}

export async function getRatingsForTitle(titleId: string) {
  await ensureMigrated();
  return db.select().from(cachedRatings).where(eq(cachedRatings.titleId, titleId));
}

export async function getWatchProvidersForTitle(titleId: string) {
  await ensureMigrated();
  return db
    .select()
    .from(cachedWatchProviders)
    .where(eq(cachedWatchProviders.titleId, titleId));
}
