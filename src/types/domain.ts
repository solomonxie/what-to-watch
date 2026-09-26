export type ProviderId = 'tmdb' | 'omdb' | 'imdb';

export type MediaType = 'movie' | 'tv';

export interface CastMember {
  name: string;
  character?: string;
  order?: number;
  profilePath?: string;
}

export type RatingSource = 'tmdb' | 'imdb' | 'rotten_tomatoes' | 'metacritic';

export interface ProviderRating {
  source: RatingSource;
  rawValue: number;
  scale: '0-10' | '0-100' | 'percent';
  normalizedValue: number;
}

export interface WatchProviderAvailability {
  platformId: string;
  platformName: string;
  region: string;
  availabilityType: 'flatrate' | 'rent' | 'buy' | 'free';
  logoPath?: string;
  /** TMDB's watch page for the title in this region. */
  link?: string;
}

export interface ProviderSearchResult {
  providerId: ProviderId;
  externalId: string;
  title: string;
  year?: number;
  posterPath?: string;
  mediaType: MediaType;
}

export interface ProviderTitleDetails {
  providerId: ProviderId;
  externalId: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  runtimeMinutes?: number;
  genres: string[];
  mediaType: MediaType;
  originalLanguage?: string;
  originCountries?: string[];
  cast?: string[];
  imdbId?: string;
  tmdbId?: string;
  omdbId?: string;
}

export interface NormalizedTitle extends ProviderTitleDetails {
  id: string;
  ratings: ProviderRating[];
  primaryRatingScore?: number;
}

export interface ExternalReview {
  source: RatingSource;
  author?: string;
  content: string;
  url?: string;
}

export type WatchStatus = 'toWatch' | 'watching' | 'completed' | 'dropped';

export interface FilterState {
  ratingRange: [number, number];
  minWatchCount: number;
  genres: string[];
  yearRange: [number, number];
  regions: string[];
  languages: string[];
  cast: string[];
}

// 'popularity' keeps the source order (platform rank).
export type SortKey = 'popularity' | 'rating' | 'year' | 'title';

export interface SortState {
  key: SortKey;
  direction: 'asc' | 'desc';
}
