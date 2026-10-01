import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import { Spotlight } from '../native/SpotlightModule';
import type { RootStackParamList } from './types';

let launchHandled = false;

/** The launch link, or the Spotlight result that launched the app; once per launch, not per remount. */
async function getInitialURL(): Promise<string | null> {
  if (launchHandled) return null;
  launchHandled = true;
  const [url, spotlight] = await Promise.all([
    Linking.getInitialURL(),
    Spotlight.takeInitialURL().catch(() => null),
  ]);
  return spotlight ?? url ?? null;
}

// initialRouteName keeps the stack's root under a linked screen, so Back works.
export const linking = {
  prefixes: ['whattowatch://'],
  getInitialURL,
  config: {
    screens: {
      Tabs: {
        screens: {
          DiscoverTab: {
            initialRouteName: 'DiscoverHome',
            screens: {
              DiscoverHome: 'discover',
              Title: 'title/:titleId',
              Filters: 'filters',
            },
          },
          LibraryTab: {
            initialRouteName: 'LibraryHome',
            screens: {
              LibraryHome: 'library',
              LibrarySection: 'library/:title',
            },
          },
          SettingsTab: {
            initialRouteName: 'SettingsHome',
            screens: {
              SettingsHome: 'settings',
              Taste: 'taste',
              Region: 'region',
              ICloudBackups: 'backups',
            },
          },
        },
      },
      Search: { screens: { SearchHome: 'search' } },
    },
  },
} as LinkingOptions<RootStackParamList>;
