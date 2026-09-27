export interface PlatformConfig {
  id: string;
  name: string;
  tmdbProviderId: number;
  /** Where it streams, when that's not everywhere. */
  regions?: string[];
}

export const PLATFORMS: PlatformConfig[] = [
  { id: 'netflix', name: 'Netflix', tmdbProviderId: 8 },
  { id: 'appletv', name: 'Apple TV+', tmdbProviderId: 350 },
  { id: 'disneyplus', name: 'Disney+', tmdbProviderId: 337 },
  { id: 'hbomax', name: 'Max', tmdbProviderId: 1899 },
  { id: 'primevideo', name: 'Prime Video', tmdbProviderId: 9 },
  { id: 'hulu', name: 'Hulu', tmdbProviderId: 15 },
  { id: 'crave', name: 'Crave', tmdbProviderId: 230, regions: ['CA'] },
];

export const DEFAULT_ENABLED_PLATFORM_IDS = ['netflix', 'appletv'];

export const DEFAULT_REGION = 'US';
export const DEFAULT_LANGUAGE = 'en-US';
