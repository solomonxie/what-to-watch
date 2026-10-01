import { getApiKey } from '../secureStorage/apiKeyStore';
import { fetchJson } from './httpClient';
import { normalizeRating } from './ratingNormalization';
import {
  pickCertification,
  type RegionCertification,
} from '../catalog/ageRating';
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
  popularity?: number;
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
> & { link?: string };

interface TmdbDetailsResponse extends TmdbListItem {
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ name: string }>;
  imdb_id?: string;
  production_countries?: Array<{ iso_3166_1: string }>;
  external_ids?: { imdb_id?: string | null };
  credits?: TmdbCreditsResponse;
  'watch/providers'?: { results: Record<string, TmdbRegionProviders> };
  release_dates?: TmdbReleaseDates;
  content_ratings?: TmdbContentRatings;
}

interface TmdbReleaseDates {
  results: Array<{
    iso_3166_1: string;
    release_dates: Array<{ certification: string }>;
  }>;
}

interface TmdbContentRatings {
  results: Array<{ iso_3166_1: string; rating: string }>;
}

function certificationsOf(
  data: Pick<TmdbDetailsResponse, 'release_dates' | 'content_ratings'>,
): RegionCertification[] {
  return [
    ...(data.release_dates?.results ?? []).flatMap(r =>
      r.release_dates.map(d => ({
        country: r.iso_3166_1,
        certification: d.certification,
      })),
    ),
    ...(data.content_ratings?.results ?? []).map(r => ({
      country: r.iso_3166_1,
      certification: r.rating,
    })),
  ];
}

const CERTIFICATION_PART: Record<MediaType, string> = {
  movie: 'release_dates',
  tv: 'content_ratings',
};

/** Just the age certification, for titles that came from list results. */
export async function getCertification(
  tmdbId: string,
  mediaType: MediaType,
  region: string,
  originCountries?: string[] | null,
): Promise<string> {
  const path = `/${mediaType}/${tmdbId}/${CERTIFICATION_PART[mediaType]}`;
  const entries =
    mediaType === 'movie'
      ? certificationsOf({ release_dates: await get<TmdbReleaseDates>(path) })
      : certificationsOf({
          content_ratings: await get<TmdbContentRatings>(path),
        });
  return pickCertification(entries, region, originCountries ?? []);
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
      link: regionData.link,
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
    append_to_response: `credits,watch/providers,external_ids,${CERTIFICATION_PART[mediaType]}`,
  });
  const details = toDetails(data, mediaType);
  return {
    details: {
      ...details,
      certification: pickCertification(
        certificationsOf(data),
        region,
        details.originCountries,
      ),
    },
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

export interface DiscoveredTitleMeta extends DiscoveredTitle {
  popularity: number;
  voteAverage: number;
}

export async function discoverTitles(
  mediaType: MediaType,
  params: Record<string, string>,
): Promise<DiscoveredTitleMeta[]> {
  const data = await get<TmdbListResponse>(`/discover/${mediaType}`, {
    language: 'en-US',
    sort_by: 'popularity.desc',
    ...params,
  });
  return data.results
    .filter(item => item.title || item.name)
    .map(item => toListMeta(item, mediaType));
}

/** Most popular titles streamable (flatrate) on a platform in a region. */
export async function discoverByPlatform(
  tmdbProviderId: number,
  region: string,
  mediaType: MediaType,
): Promise<DiscoveredTitle[]> {
  return discoverTitles(mediaType, {
    watch_region: region,
    with_watch_providers: String(tmdbProviderId),
    with_watch_monetization_types: 'flatrate',
  });
}

/** Search results with list-level details, so matches can be cached without another request. */
export async function searchDetailed(
  query: string,
  language = 'en-US',
): Promise<DiscoveredTitleMeta[]> {
  const data = await get<TmdbListResponse>('/search/multi', {
    query,
    language,
  });
  return data.results
    .filter(
      r =>
        (r.media_type === 'movie' || r.media_type === 'tv') &&
        (r.title || r.name),
    )
    .map(r => toListMeta(r, r.media_type as MediaType));
}

export async function findByImdbId(
  imdbId: string,
): Promise<DiscoveredTitleMeta | null> {
  const data = await get<{
    movie_results: TmdbListItem[];
    tv_results: TmdbListItem[];
  }>(`/find/${imdbId}`, { external_source: 'imdb_id', language: 'en-US' });
  if (data.movie_results[0]) return toListMeta(data.movie_results[0], 'movie');
  if (data.tv_results[0]) return toListMeta(data.tv_results[0], 'tv');
  return null;
}

/** An IMDb episode id → its show on TMDB and where it sits. */
export async function findEpisodeByImdbId(
  imdbId: string,
): Promise<{ showId: string; season: number; episode: number } | null> {
  const data = await get<{
    tv_episode_results?: Array<{
      show_id: number;
      season_number: number;
      episode_number: number;
    }>;
  }>(`/find/${imdbId}`, { external_source: 'imdb_id' });
  const hit = data.tv_episode_results?.[0];
  return hit
    ? {
        showId: String(hit.show_id),
        season: hit.season_number,
        episode: hit.episode_number,
      }
    : null;
}

function toListMeta(
  item: TmdbListItem,
  mediaType: MediaType,
): DiscoveredTitleMeta {
  return {
    details: toDetails(item, mediaType),
    ratings: tmdbRating(item.vote_average, item.vote_count),
    popularity: item.popularity ?? 0,
    voteAverage: item.vote_average ?? 0,
  };
}

export async function searchKeywords(
  query: string,
): Promise<Array<{ id: number; name: string }>> {
  const data = await get<{ results: Array<{ id: number; name: string }> }>(
    '/search/keyword',
    {
      query,
    },
  );
  return data.results.slice(0, 20);
}

export interface TmdbReview {
  id: string;
  author: string;
  rating?: number;
  content: string;
  createdAt: string;
}

// Reviews arrive as loose Markdown/HTML; show them as plain text.
export function plainReviewText(content: string): string {
  return content
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|\*)(\S[^]*?\S|\S)\1/g, '$2')
    .replace(/(^|\W)_{1,2}(\S[^]*?\S|\S)_{1,2}(?=\W|$)/g, '$1$2')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function getReviews(
  tmdbId: string,
  mediaType: MediaType,
): Promise<{ reviews: TmdbReview[]; total: number }> {
  const data = await get<{
    total_results: number;
    results: Array<{
      id: string;
      author: string;
      author_details?: { rating?: number | null };
      content: string;
      created_at: string;
    }>;
  }>(`/${mediaType}/${tmdbId}/reviews`);
  return {
    total: data.total_results,
    reviews: data.results
      .map(r => ({
        id: r.id,
        author: r.author,
        rating: r.author_details?.rating ?? undefined,
        content: plainReviewText(r.content),
        createdAt: r.created_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export interface TmdbSeason {
  number: number;
  name: string;
  overview: string;
  airDate?: string;
  episodeCount: number;
  rating?: number;
}

export interface TmdbEpisode {
  number: number;
  name: string;
  overview: string;
  airDate?: string;
  runtime?: number;
  rating?: number;
}

const voted = (average?: number, count = 1) =>
  average && count > 0 ? average : undefined;

export interface TmdbShowSeasons {
  seasons: TmdbSeason[];
  /** Regular (non-special) episodes aired so far. */
  airedEpisodes: number;
}

/** Regular seasons in order, specials last. */
export async function getSeasons(tmdbId: string): Promise<TmdbShowSeasons> {
  const data = await get<{
    last_episode_to_air?: {
      season_number: number;
      episode_number: number;
    } | null;
    seasons?: Array<{
      season_number: number;
      name: string;
      overview?: string;
      air_date?: string | null;
      episode_count: number;
      vote_average?: number;
    }>;
  }>(`/tv/${tmdbId}`);
  const seasons = (data.seasons ?? [])
    .filter(s => s.episode_count > 0)
    .map(s => ({
      number: s.season_number,
      name: s.name,
      overview: s.overview ?? '',
      airDate: s.air_date ?? undefined,
      episodeCount: s.episode_count,
      rating: voted(s.vote_average),
    }))
    .sort((a, b) => (a.number || Infinity) - (b.number || Infinity));
  const last = data.last_episode_to_air;
  const airedEpisodes = last
    ? seasons
        .filter(s => s.number > 0 && s.number < last.season_number)
        .reduce((sum, s) => sum + s.episodeCount, 0) + last.episode_number
    : 0;
  return { seasons, airedEpisodes };
}

export async function getEpisodes(
  tmdbId: string,
  season: number,
): Promise<TmdbEpisode[]> {
  const data = await get<{
    episodes?: Array<{
      episode_number: number;
      name: string;
      overview?: string;
      air_date?: string | null;
      runtime?: number | null;
      vote_average?: number;
      vote_count?: number;
    }>;
  }>(`/tv/${tmdbId}/season/${season}`);
  return (data.episodes ?? []).map(e => ({
    number: e.episode_number,
    name: e.name,
    overview: e.overview ?? '',
    airDate: e.air_date ?? undefined,
    runtime: e.runtime ?? undefined,
    rating: voted(e.vote_average, e.vote_count),
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
        originalTitle: r.original_title ?? r.original_name,
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
