import { Platform, Settings } from 'react-native';

/** App Store the build targets: `us` (Canada/US) or `cn`. */
export type StoreRegion = 'us' | 'cn';

/** Set at build time (`make ios STORE=cn`), via Info.plist AppStoreRegion. */
export function storeRegion(): StoreRegion {
  if (Platform.OS !== 'ios') return 'us';
  try {
    return Settings.get('appStoreRegion') === 'cn' ? 'cn' : 'us';
  } catch {
    return 'us';
  }
}
