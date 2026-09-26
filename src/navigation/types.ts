import type { NavigatorScreenParams } from '@react-navigation/native';

export type TitleParams = { titleId: string };

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  Title: TitleParams;
  Filters: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  Title: TitleParams;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ApiKey: { providerId: 'tmdb' | 'omdb' };
  Region: undefined;
};

export type TabParamList = {
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};
