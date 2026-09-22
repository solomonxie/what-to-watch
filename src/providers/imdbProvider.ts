import { getApiKey } from '../secureStorage/apiKeyStore';
import type {
  CastMember,
  ProviderRating,
  ProviderSearchResult,
  ProviderTitleDetails,
  WatchProviderAvailability,
} from '../types/domain';
import type { MetadataProvider, SearchOptions } from './types';

const NOT_IMPLEMENTED =
  'The official IMDb API integration is not implemented yet — its endpoint contract requires an enterprise license. The key slot exists in Settings so it can be wired up later.';

export const imdbProvider: MetadataProvider = {
  id: 'imdb',

  async isConfigured() {
    return (await getApiKey('imdb')) !== null;
  },

  async searchTitles(
    _query: string,
    _opts?: SearchOptions,
  ): Promise<ProviderSearchResult[]> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async getTitleDetails(_externalId: string): Promise<ProviderTitleDetails> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async getCast(_externalId: string): Promise<CastMember[]> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async getRatings(_externalId: string): Promise<ProviderRating[]> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async getWatchProviders(
    _externalId: string,
    _region: string,
  ): Promise<WatchProviderAvailability[]> {
    throw new Error(NOT_IMPLEMENTED);
  },
};
