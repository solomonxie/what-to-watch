import type {
  ProviderId,
  ProviderSearchResult,
  ProviderTitleDetails,
  CastMember,
  ProviderRating,
  WatchProviderAvailability,
} from '../types/domain';

export interface SearchOptions {
  mediaType?: 'movie' | 'tv';
  region?: string;
  language?: string;
}

export interface MetadataProvider {
  id: ProviderId;
  isConfigured(): Promise<boolean>;
  searchTitles(
    query: string,
    opts?: SearchOptions,
  ): Promise<ProviderSearchResult[]>;
  getTitleDetails(externalId: string): Promise<ProviderTitleDetails>;
  getCast(externalId: string): Promise<CastMember[]>;
  getRatings(externalId: string): Promise<ProviderRating[]>;
  getWatchProviders(
    externalId: string,
    region: string,
  ): Promise<WatchProviderAvailability[]>;
}
