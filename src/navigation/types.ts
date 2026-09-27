import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Facet } from '../prefs/prefsStore';

export type TitleParams = { titleId: string };

/** Taste routes (Settings stack). */
export type TasteStackParamList = {
  Taste: undefined;
  AddFacet: { facet: Facet };
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  Title: TitleParams;
  Filters: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  LibrarySection: { title: string };
  Title: TitleParams;
};

export type SettingsStackParamList = TasteStackParamList & {
  SettingsHome: undefined;
  ApiKey: { providerId: 'tmdb' | 'omdb' };
  Region: undefined;
  ICloudBackups: undefined;
};

export type SearchStackParamList = {
  SearchHome: { q?: string } | undefined;
  Title: TitleParams;
};

export type TabParamList = {
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
};
