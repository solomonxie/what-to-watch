import { getApiKey } from '../secureStorage/apiKeyStore';
import { fetchJson } from './httpClient';
import { normalizeRating } from './ratingNormalization';
import type {
  CastMember,
  MediaType,
  ProviderRating,
  ProviderSearchResult,
  ProviderTitleDetails,
  RatingSource,
  WatchProviderAvailability,
} from '../types/domain';
import type { MetadataProvider, SearchOptions } from './types';

const BASE_URL = 'https://www.omdbapi.com/';

interface OmdbSearchResponse {
  Search?: Array<{
    imdbID: string;
    Title: string;
    Year: string;
    Poster: string;
    Type: string;
  }>;
  Response: string;
}

interface OmdbDetailsResponse {
  imdbID: string;
  Title: string;
  Year: string;
  Plot?: string;
  Poster?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Actors?: string;
  Type?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Response: string;
}

async function apiKeyOrThrow(): Promise<string> {
  const key = await getApiKey('omdb');
  if (!key) throw new Error('OMDb API key is not configured');
  return key;
}

function mediaTypeOf(type?: string): MediaType {
  return type === 'series' ? 'tv' : 'movie';
}

function parseRuntime(runtime?: string): number | undefined {
  if (!runtime) return undefined;
  const match = runtime.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function ratingSourceOf(source: string): RatingSource | null {
  if (source === 'Internet Movie Database') return 'imdb';
  if (source === 'Rotten Tomatoes') return 'rotten_tomatoes';
  if (source === 'Metacritic') return 'metacritic';
  return null;
}

export const omdbProvider: MetadataProvider = {
  id: 'omdb',

  async isConfigured() {
    return (await getApiKey('omdb')) !== null;
  },

  async searchTitles(
    query: string,
    _opts?: SearchOptions,
  ): Promise<ProviderSearchResult[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(query)}`;
    const data = await fetchJson<OmdbSearchResponse>(url);
    if (data.Response === 'False' || !data.Search) return [];
    return data.Search.map(r => ({
      providerId: 'omdb' as const,
      externalId: r.imdbID,
      title: r.Title,
      year: parseInt(r.Year, 10) || undefined,
      posterPath: r.Poster !== 'N/A' ? r.Poster : undefined,
      mediaType: mediaTypeOf(r.Type),
    }));
  },

  async getTitleDetails(externalId: string): Promise<ProviderTitleDetails> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}?apikey=${apiKey}&i=${externalId}&plot=full`;
    const data = await fetchJson<OmdbDetailsResponse>(url);
    return {
      providerId: 'omdb',
      externalId,
      title: data.Title,
      overview: data.Plot,
      posterPath: data.Poster !== 'N/A' ? data.Poster : undefined,
      releaseDate: data.Released,
      runtimeMinutes: parseRuntime(data.Runtime),
      genres: data.Genre ? data.Genre.split(',').map(g => g.trim()) : [],
      mediaType: mediaTypeOf(data.Type),
      imdbId: data.imdbID,
      omdbId: data.imdbID,
    };
  },

  async getCast(externalId: string): Promise<CastMember[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}?apikey=${apiKey}&i=${externalId}`;
    const data = await fetchJson<OmdbDetailsResponse>(url);
    if (!data.Actors) return [];
    return data.Actors.split(',').map((name, order) => ({
      name: name.trim(),
      order,
    }));
  },

  async getRatings(externalId: string): Promise<ProviderRating[]> {
    const apiKey = await apiKeyOrThrow();
    const url = `${BASE_URL}?apikey=${apiKey}&i=${externalId}`;
    const data = await fetchJson<OmdbDetailsResponse>(url);
    const ratings: ProviderRating[] = [];
    for (const r of data.Ratings ?? []) {
      const source = ratingSourceOf(r.Source);
      if (!source) continue;
      if (r.Value.includes('%')) {
        ratings.push(
          normalizeRating({
            source,
            rawValue: parseFloat(r.Value),
            scale: 'percent',
          }),
        );
      } else if (r.Value.includes('/100')) {
        ratings.push(
          normalizeRating({
            source,
            rawValue: parseFloat(r.Value),
            scale: '0-100',
          }),
        );
      } else if (r.Value.includes('/10')) {
        ratings.push(
          normalizeRating({
            source,
            rawValue: parseFloat(r.Value),
            scale: '0-10',
          }),
        );
      }
    }
    return ratings;
  },

  async getWatchProviders(
    _externalId: string,
    _region: string,
  ): Promise<WatchProviderAvailability[]> {
    return [];
  },
};
