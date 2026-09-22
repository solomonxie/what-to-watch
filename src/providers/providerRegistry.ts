import { tmdbProvider } from './tmdbProvider';
import { omdbProvider } from './omdbProvider';
import { imdbProvider } from './imdbProvider';
import type { MetadataProvider } from './types';
import type { ProviderId } from '../types/domain';

const ALL_PROVIDERS: MetadataProvider[] = [tmdbProvider, omdbProvider, imdbProvider];

export function getProvider(id: ProviderId): MetadataProvider {
  const provider = ALL_PROVIDERS.find(p => p.id === id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);
  return provider;
}

export async function getActiveProviders(): Promise<MetadataProvider[]> {
  const flags = await Promise.all(ALL_PROVIDERS.map(p => p.isConfigured()));
  return ALL_PROVIDERS.filter((_, i) => flags[i]);
}

export async function isProviderActive(id: ProviderId): Promise<boolean> {
  return getProvider(id).isConfigured();
}
