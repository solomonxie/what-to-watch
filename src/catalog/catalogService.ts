import {
  discoverByPlatform,
  getTmdbFullTitle,
  tmdbProvider,
} from '../providers/tmdbProvider';
import { omdbProvider } from '../providers/omdbProvider';
import { mergeTitleDetails } from '../providers/mergeService';
import {
  getAllCachedTitles,
  replaceWatchProviders,
  upsertTitle,
} from '../db/repositories/titlesRepo';
import {
  getPlatformRanking,
  replacePlatformRanking,
} from '../db/repositories/rankingsRepo';
import { buildSearchIndex } from '../search/fuseIndex';
import type { PlatformConfig } from '../config/platforms';
import type {
  MediaType,
  NormalizedTitle,
  ProviderRating,
  ProviderSearchResult,
  ProviderTitleDetails,
} from '../types/domain';

const RANKING_CATEGORY = 'popular';

// TMDB movie and tv ids overlap, so the media type is part of the key.
export function titleIdFor(mediaType: MediaType, tmdbId: string): string {
  return `${mediaType}:${tmdbId}`;
}

export function parseTitleId(
  id: string,
): { mediaType: MediaType; tmdbId: string } | null {
  const match = id.match(/^(movie|tv):(\d+)$/);
  return match ? { mediaType: match[1] as MediaType, tmdbId: match[2] } : null;
}

function normalize(
  details: ProviderTitleDetails[],
  ratings: ProviderRating[],
  mediaType: MediaType,
  tmdbId: string,
): NormalizedTitle {
  return {
    ...mergeTitleDetails(details, ratings),
    id: titleIdFor(mediaType, tmdbId),
  };
}

async function omdbExtras(imdbId?: string) {
  if (!imdbId || !(await omdbProvider.isConfigured())) return null;
  try {
    const [details, ratings] = await Promise.all([
      omdbProvider.getTitleDetails(imdbId),
      omdbProvider.getRatings(imdbId),
    ]);
    return { details, ratings };
  } catch {
    return null;
  }
}

export async function fetchAndCacheTitle(
  tmdbId: string,
  mediaType: MediaType,
  region: string,
): Promise<string> {
  const full = await getTmdbFullTitle(tmdbId, mediaType, region);
  const omdb = await omdbExtras(full.details.imdbId);
  const title = normalize(
    omdb ? [full.details, omdb.details] : [full.details],
    [...full.ratings, ...(omdb?.ratings ?? [])],
    mediaType,
    tmdbId,
  );
  await upsertTitle(title);
  await replaceWatchProviders(title.id, region, full.watchProviders);
  await refreshSearchIndex();
  return title.id;
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export async function refreshPlatformRanking(
  platform: PlatformConfig,
  region: string,
  force = false,
) {
  if (!force) {
    const cached = await getPlatformRanking(
      platform.id,
      region,
      RANKING_CATEGORY,
    );
    if (cached.length > 0) return cached;
  }
  const [movies, shows] = await Promise.all([
    discoverByPlatform(platform.tmdbProviderId, region, 'movie'),
    discoverByPlatform(platform.tmdbProviderId, region, 'tv'),
  ]);
  const ids: string[] = [];
  for (const item of interleave(movies, shows)) {
    const title = normalize(
      [item.details],
      item.ratings,
      item.details.mediaType,
      item.details.externalId,
    );
    await upsertTitle(title);
    ids.push(title.id);
  }
  await replacePlatformRanking(platform.id, region, RANKING_CATEGORY, ids);
  await refreshSearchIndex();
  return getPlatformRanking(platform.id, region, RANKING_CATEGORY);
}

export async function searchOnline(
  query: string,
): Promise<ProviderSearchResult[]> {
  if (!query.trim() || !(await tmdbProvider.isConfigured())) return [];
  return tmdbProvider.searchTitles(query);
}

/** Cache a list result (discover/search) without an extra details request. */
export async function cacheListTitle(
  details: ProviderTitleDetails,
  ratings: ProviderRating[],
): Promise<string> {
  const title = normalize(
    [details],
    ratings,
    details.mediaType,
    details.externalId,
  );
  await upsertTitle(title);
  return title.id;
}

export async function refreshSearchIndex(): Promise<void> {
  buildSearchIndex(await getAllCachedTitles());
}
