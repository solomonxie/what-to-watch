import { getApiKey } from '../secureStorage/apiKeyStore';
import { fetchJson } from './httpClient';
import { normalizeRating } from './ratingNormalization';
import type {
  CastMember,
  MediaType,
  ProviderRating,
  ProviderSearchResult,
  ProviderTitleDetails,
  WatchProviderAvailability,
} from '../types/domain';
import type { MetadataProvider, SearchOptions } from './types';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

// TMDB genre ids are stable; discover results only carry ids.
const GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  media_type?: string;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
  vote_average?: number;
  vote_count?: number;
}

interface TmdbListResponse {
  results: TmdbListItem[];
}

interface TmdbWatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

type TmdbRegionProviders = Partial<
  Record<'flatrate' | 'rent' | 'buy' | 'free', TmdbWatchProviderEntry[]>
>;

interface TmdbDetailsResponse extends TmdbListItem {
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ name: string }>;
  imdb_id?: string;
  production_countries?: Array<{ iso_3166_1: string }>;
  external_ids?: { imdb_id?: string | null };
  credits?: TmdbCreditsResponse;
  'watch/providers'?: { results: Record<string, TmdbRegionProviders> };
}

interface TmdbCreditsResponse {
  cast: Array<{
    name: string;
    character?: string;
    order?: number;
    profile_path?: string | null;
  }>;
}

export interface TmdbFullTitle {
  details: ProviderTitleDetails;
  castMembers: CastMember[];
  ratings: ProviderRating[];
  watchProviders: WatchProviderAvailability[];
}

async function apiKeyOrThrow(): Promise<string> {
  const key = await getApiKey('tmdb');
  if (!key) throw new Error('TMDB API key is not configured');
  return key;
}

async function get<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const apiKey = await apiKeyOrThrow();
  const query = Object.entries({ api_key: apiKey, ...params })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return fetchJson<T>(`${BASE_URL}${path}?${query}`);
}

function mediaTypeOf(result: {
  media_type?: string;
  title?: string;
}): MediaType {
  if (result.media_type === 'tv') return 'tv';
  if (result.media_type === 'movie') return 'movie';
  return result.title ? 'movie' : 'tv';
}

function image(path?: string | null): string | undefined {
  return path ? `${IMAGE_BASE}${path}` : undefined;
}

function toCastMembers(credits?: TmdbCreditsResponse): CastMember[] {
  return (credits?.cast ?? []).slice(0, 20).map(c => ({
    name: c.name,
    character: c.character,
    order: c.order,
    profilePath: image(c.profile_path),
  }));
}

function tmdbRating(
  voteAverage?: number,
  voteCount?: number,
): ProviderRating[] {
  if (voteAverage === undefined || !voteCount) return [];
  return [
    normalizeRating({ source: 'tmdb', rawValue: voteAverage, scale: '0-10' }),
  ];
}

function toWatchProviders(
  region: string,
  regionData?: TmdbRegionProviders,
): WatchProviderAvailability[] {
  if (!regionData) return [];
  const types: WatchProviderAvailability['availabilityType'][] = [
    'flatrate',
    'free',
    'rent',
    'buy',
  ];
  return types.flatMap(type =>
    (regionData[type] ?? []).map(p => ({
      platformId: String(p.provider_id),
      platformName: p.provider_name,
      region,
      availabilityType: type,
      logoPath: image(p.logo_path),
    })),
  );
}

function toDetails(
  data: TmdbDetailsResponse,
  mediaType: MediaType,
): ProviderTitleDetails {
  const countries =
    data.origin_country ??
    data.production_countries?.map(c => c.iso_3166_1) ??
    [];
  return {
    providerId: 'tmdb',
    externalId: String(data.id),
    title: (data.title ?? data.name)!,
    originalTitle: data.original_title ?? data.original_name,
    overview: data.overview || undefined,
    posterPath: image(data.poster_path),
    releaseDate: data.release_date || data.first_air_date || undefined,
    runtimeMinutes: data.runtime || data.episode_run_time?.[0] || undefined,
    genres: data.genres
      ? data.genres.map(g => g.name)
      : (data.genre_ids ?? []).map(id => GENRE_NAMES[id]).filter(Boolean),
    mediaType,
    originalLanguage: data.original_language,
    originCountries: countries,
    cast: data.credits
      ? toCastMembers(data.credits)
          .slice(0, 10)
          .map(c => c.name)
      : undefined,
    imdbId: data.imdb_id ?? data.external_ids?.imdb_id ?? undefined,
    tmdbId: String(data.id),
  };
}

/** Details, credits, ratings and region availability in one request. */
export async function getTmdbFullTitle(
  tmdbId: string,
  mediaType: MediaType,
  region: string,
): Promise<TmdbFullTitle> {
  const data = await get<TmdbDetailsResponse>(`/${mediaType}/${tmdbId}`, {
    language: 'en-US',
    append_to_response: 'credits,watch/providers,external_ids',
  });
  return {
    details: toDetails(data, mediaType),
    castMembers: toCastMembers(data.credits),
    ratings: tmdbRating(data.vote_average, data.vote_count),
    watchProviders: toWatchProviders(
      region,
      data['watch/providers']?.results[region],
    ),
  };
}

export interface DiscoveredTitle {
  details: ProviderTitleDetails;
  ratings: ProviderRating[];
}

/** Most popular titles streamable (flatrate) on a platform in a region. */
export async function discoverByPlatform(
  tmdbProviderId: number,
  region: string,
  mediaType: MediaType,
): Promise<DiscoveredTitle[]> {
  const data = await get<TmdbListResponse>(`/discover/${mediaType}`, {
    language: 'en-US',
    sort_by: 'popularity.desc',
    watch_region: region,
    with_watch_providers: String(tmdbProviderId),
    with_watch_monetization_types: 'flatrate',
  });
  return data.results.map(item => ({
    details: toDetails(item, mediaType),
    ratings: tmdbRating(item.vote_average, item.vote_count),
  }));
}

export const tmdbProvider: MetadataProvider = {
  id: 'tmdb',

  async isConfigured() {
    return (await getApiKey('tmdb')) !== null;
  },

  async searchTitles(
    query: string,
    opts?: SearchOptions,
  ): Promise<ProviderSearchResult[]> {
    const data = await get<TmdbListResponse>('/search/multi', {
      query,
      language: opts?.language ?? 'en-US',
    });
    return data.results
      .filter(
        r =>
          (r.media_type === 'movie' || r.media_type === 'tv') &&
          (r.title || r.name),
      )
      .map(r => ({
        providerId: 'tmdb' as const,
        externalId: String(r.id),
        title: (r.title ?? r.name)!,
        year: parseYear(r.release_date ?? r.first_air_date),
        posterPath: image(r.poster_path),
        mediaType: mediaTypeOf(r),
      }));
  },

  async getTitleDetails(externalId, mediaType = 'movie') {
    const data = await get<TmdbDetailsResponse>(`/${mediaType}/${externalId}`, {
      language: 'en-US',
      append_to_response: 'credits,external_ids',
    });
    return toDetails(data, mediaType);
  },

  async getCast(externalId, mediaType = 'movie') {
    const data = await get<TmdbCreditsResponse>(
      `/${mediaType}/${externalId}/credits`,
    );
    return toCastMembers(data);
  },

  async getRatings(externalId, mediaType = 'movie') {
    const data = await get<TmdbDetailsResponse>(`/${mediaType}/${externalId}`);
    return tmdbRating(data.vote_average, data.vote_count);
  },

  async getWatchProviders(externalId, region, mediaType = 'movie') {
    const data = await get<{ results: Record<string, TmdbRegionProviders> }>(
      `/${mediaType}/${externalId}/watch/providers`,
    );
    return toWatchProviders(region, data.results[region]);
  },
};

function parseYear(date?: string): number | undefined {
  if (!date) return undefined;
  const year = parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}
