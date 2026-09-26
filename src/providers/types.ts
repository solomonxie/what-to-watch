import type {
  ProviderId,
  ProviderSearchResult,
  ProviderTitleDetails,
  CastMember,
  MediaType,
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
  getTitleDetails(
    externalId: string,
    mediaType?: MediaType,
  ): Promise<ProviderTitleDetails>;
  getCast(externalId: string, mediaType?: MediaType): Promise<CastMember[]>;
  getRatings(externalId: string, mediaType?: MediaType): Promise<ProviderRating[]>;
  getWatchProviders(
    externalId: string,
    region: string,
    mediaType?: MediaType,
  ): Promise<WatchProviderAvailability[]>;
}
