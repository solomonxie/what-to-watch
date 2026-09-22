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

interface TmdbSearchResponse {
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    media_type?: string;
  }>;
}

interface TmdbDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ name: string }>;
  imdb_id?: string;
  vote_average?: number;
}

interface TmdbCreditsResponse {
  cast: Array<{
    name: string;
    character?: string;
    order?: number;
    profile_path?: string | null;
  }>;
}

interface TmdbWatchProvidersResponse {
  results: Record<
    string,
    {
      flatrate?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path?: string;
      }>;
      rent?: Array<{ provider_id: number; provider_name: string }>;
      buy?: Array<{ provider_id: number; provider_name: string }>;
      free?: Array<{ provider_id: number; provider_name: string }>;
    }
  >;
}

async function apiKeyOrThrow(): Promise<string> {
  const key = await getApiKey('tmdb');
  if (!key) throw new Error('TMDB API key is not configured');
  return key;
}

function mediaTypeOf(result: { media_type?: string; title?: string }): MediaType {
  if (result.media_type === 'tv') return 'tv';
  if (result.media_type === 'movie') return 'movie';
  return result.title ? 'movie' : 'tv';
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
    const apiKey = await apiKeyOrThrow();
    const language = opts?.language ?? 'en-US';
    const url = `${BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=${language}`;
    const data = await fetchJson<TmdbSearchResponse>(url);
    return data.results
      .filter(r => r.title || r.name)
      .map(r => ({
        providerId: 'tmdb' as const,
        externalId: String(r.id),
        title: (r.title ?? r.name)!,
        year: parseYear(r.release_date ?? r.first_air_date),
        posterPath: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : undefined,
        mediaType: mediaTypeOf(r),
      }));
  },

  async getTitleDetails(externalId: string): Promise<ProviderTitleDetails> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}/movie/${externalId}?api_key=${apiKey}&language=en-US`;
    let mediaType: MediaType = 'movie';
    let data: TmdbDetailsResponse;
    try {
      data = await fetchJson<TmdbDetailsResponse>(url);
    } catch {
      mediaType = 'tv';
      data = await fetchJson<TmdbDetailsResponse>(
        `${BASE_URL}/tv/${externalId}?api_key=${apiKey}&language=en-US`,
      );
    }
    return {
      providerId: 'tmdb',
      externalId,
      title: (data.title ?? data.name)!,
      originalTitle: data.original_title ?? data.original_name,
      overview: data.overview,
      posterPath: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : undefined,
      releaseDate: data.release_date ?? data.first_air_date,
      runtimeMinutes: data.runtime ?? data.episode_run_time?.[0],
      genres: (data.genres ?? []).map(g => g.name),
      mediaType,
      imdbId: data.imdb_id,
      tmdbId: String(data.id),
    };
  },

  async getCast(externalId: string): Promise<CastMember[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}/movie/${externalId}/credits?api_key=${apiKey}`;
    const data = await fetchJson<TmdbCreditsResponse>(url);
    return data.cast.slice(0, 20).map(c => ({
      name: c.name,
      character: c.character,
      order: c.order,
      profilePath: c.profile_path ? `${IMAGE_BASE}${c.profile_path}` : undefined,
    }));
  },

  async getRatings(externalId: string): Promise<ProviderRating[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}/movie/${externalId}?api_key=${apiKey}`;
    const data = await fetchJson<TmdbDetailsResponse>(url);
    if (data.vote_average === undefined) return [];
    return [
      normalizeRating({
        source: 'tmdb',
        rawValue: data.vote_average,
        scale: '0-10',
      }),
    ];
  },

  async getWatchProviders(
    externalId: string,
    region: string,
  ): Promise<WatchProviderAvailability[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}/movie/${externalId}/watch/providers?api_key=${apiKey}`;
    const data = await fetchJson<TmdbWatchProvidersResponse>(url);
    const regionData = data.results[region];
    if (!regionData) return [];
    const out: WatchProviderAvailability[] = [];
    const push = (
      list: typeof regionData.flatrate,
      type: WatchProviderAvailability['availabilityType'],
    ) => {
      for (const p of list ?? []) {
        out.push({
          platformId: String(p.provider_id),
          platformName: p.provider_name,
          region,
          availabilityType: type,
          logoPath: 'logo_path' in p && p.logo_path ? `${IMAGE_BASE}${p.logo_path}` : undefined,
        });
      }
    };
    push(regionData.flatrate, 'flatrate');
    push(regionData.rent, 'rent');
    push(regionData.buy, 'buy');
    push(regionData.free, 'free');
    return out;
  },
};

function parseYear(date?: string): number | undefined {
  if (!date) return undefined;
  const year = parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}
