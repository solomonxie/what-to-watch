import { NativeModules, Platform } from 'react-native';

export interface SpotlightItem {
  id: string;
  domain: string;
  title: string;
  description?: string;
  keywords?: string[];
  /** Higher ranks first among this app's results. */
  rankingHint?: number;
}

interface NativeSpotlightModule {
  isAvailable(): Promise<boolean>;
  index(items: SpotlightItem[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  removeAll(): Promise<void>;
  takeInitialURL(): Promise<string | null>;
}

const NativeModule: NativeSpotlightModule | undefined =
  Platform.OS === 'ios' ? NativeModules.SpotlightModule : undefined;

/** iOS Spotlight; a no-op elsewhere. */
export const Spotlight = {
  isAvailable: async () => !!NativeModule && NativeModule.isAvailable(),
  index: async (items: SpotlightItem[]) => NativeModule?.index(items),
  remove: async (ids: string[]) => NativeModule?.remove(ids),
  removeAll: async () => NativeModule?.removeAll(),
  /** The title link a Spotlight tap launched the app with, once. */
  takeInitialURL: async () => (await NativeModule?.takeInitialURL()) ?? null,
};
