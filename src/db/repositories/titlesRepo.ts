import { and, eq, inArray } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { cachedTitles, cachedRatings, cachedWatchProviders } from '../schema';
import type {
  NormalizedTitle,
  WatchProviderAvailability,
} from '../../types/domain';

export async function upsertTitle(title: NormalizedTitle): Promise<void> {
  await ensureMigrated();
  const facets = {
    originalLanguage: title.originalLanguage,
    originCountries: title.originCountries,
    castNames: title.cast,
    certification: title.certification,
    popularity: title.popularity,
  };
  await db
    .insert(cachedTitles)
    .values({
      ...facets,
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
        originalTitle: title.originalTitle,
        overview: title.overview,
        posterPath: title.posterPath,
        releaseDate: title.releaseDate,
        genres: title.genres,
        imdbId: title.imdbId,
        primaryRatingScore: title.primaryRatingScore,
        // Discover results lack cast; keep what a full fetch stored.
        ...Object.fromEntries(
          Object.entries(facets).filter(([, v]) => v !== undefined),
        ),
        ...(title.runtimeMinutes
          ? { runtimeMinutes: title.runtimeMinutes }
          : {}),
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

export async function setCertification(
  id: string,
  certification: string,
): Promise<void> {
  await ensureMigrated();
  await db
    .update(cachedTitles)
    .set({ certification })
    .where(eq(cachedTitles.id, id));
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

/** Only what search and Spotlight need: no overview, the bulk of a row. */
export async function getSearchableTitles() {
  await ensureMigrated();
  const t = cachedTitles;
  return db
    .select({
      id: t.id,
      title: t.title,
      originalTitle: t.originalTitle,
      genres: t.genres,
      castNames: t.castNames,
      posterPath: t.posterPath,
      releaseDate: t.releaseDate,
      mediaType: t.mediaType,
      primaryRatingScore: t.primaryRatingScore,
    })
    .from(t);
}

export async function getRatingsForTitle(titleId: string) {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(cachedRatings)
    .where(eq(cachedRatings.titleId, titleId))
    .orderBy(cachedRatings.id);
  // Overlapping fetches of one title can each insert a full set; newest wins.
  return Array.from(new Map(rows.map(r => [r.source, r])).values());
}

export async function getWatchProvidersForTitle(titleId: string) {
  await ensureMigrated();
  return db
    .select()
    .from(cachedWatchProviders)
    .where(eq(cachedWatchProviders.titleId, titleId));
}

export async function replaceWatchProviders(
  titleId: string,
  region: string,
  providers: WatchProviderAvailability[],
): Promise<void> {
  await ensureMigrated();
  await db
    .delete(cachedWatchProviders)
    .where(
      and(
        eq(cachedWatchProviders.titleId, titleId),
        eq(cachedWatchProviders.region, region),
      ),
    );
  if (providers.length === 0) return;
  const now = Date.now();
  await db.insert(cachedWatchProviders).values(
    providers.map(p => ({
      titleId,
      platformId: p.platformId,
      platformName: p.platformName,
      region: p.region,
      availabilityType: p.availabilityType,
      logoPath: p.logoPath,
      link: p.link,
      fetchedAt: now,
    })),
  );
}
