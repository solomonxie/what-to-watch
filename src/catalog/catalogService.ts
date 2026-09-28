import {
  discoverByPlatform,
  getCertification,
  getEpisodes,
  getSeasons,
  getTmdbFullTitle,
  tmdbProvider,
} from '../providers/tmdbProvider';
import { omdbProvider } from '../providers/omdbProvider';
import { mergeTitleDetails } from '../providers/mergeService';
import {
  getAllCachedTitles,
  replaceWatchProviders,
  setCertification,
  upsertTitle,
} from '../db/repositories/titlesRepo';
import {
  getPlatformRanking,
  replacePlatformRanking,
} from '../db/repositories/rankingsRepo';
import { cachedResponse } from '../db/repositories/responseCacheRepo';
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
const SEASONS_TTL_MS = 24 * 60 * 60 * 1000;

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

/** Looks up certifications missing on list-sourced titles; returns how many were filled. */
export async function fillCertifications(
  titles: Array<{
    id: string;
    certification?: string | null;
    originCountries?: string[] | null;
  }>,
  region: string,
): Promise<number> {
  const queue = titles.filter(t => t.certification == null);
  let filled = 0;
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const ref = parseTitleId(t.id);
      if (!ref) continue;
      try {
        const cert = await getCertification(
          ref.tmdbId,
          ref.mediaType,
          region,
          t.originCountries,
        );
        await setCertification(t.id, cert);
        filled++;
      } catch {}
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return filled;
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

export function showSeasons(tmdbId: string) {
  return cachedResponse(`tv:${tmdbId}:seasons`, SEASONS_TTL_MS, () =>
    getSeasons(tmdbId),
  );
}

export function seasonEpisodes(tmdbId: string, season: number) {
  return cachedResponse(`tv:${tmdbId}:season:${season}`, SEASONS_TTL_MS, () =>
    getEpisodes(tmdbId, season),
  );
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
