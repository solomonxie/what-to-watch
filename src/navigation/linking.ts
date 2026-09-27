import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// initialRouteName keeps the stack's root under a linked screen, so Back works.
export const linking = {
  prefixes: ['whattowatch://'],
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
