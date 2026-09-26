import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { FiltersScreen } from '../screens/discover/FiltersScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { ImportScreen } from '../screens/library/ImportScreen';
import { TitleScreen } from '../screens/title/TitleScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ApiKeyScreen } from '../screens/settings/ApiKeyScreen';
import { RegionScreen } from '../screens/settings/RegionScreen';
import { TasteScreen } from '../screens/taste/TasteScreen';
import { AddFacetScreen } from '../screens/taste/AddFacetScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { SearchPill } from '../screens/search/SearchPill';
import type {
  DiscoverStackParamList,
  LibraryStackParamList,
  RootStackParamList,
  SearchStackParamList,
  SettingsStackParamList,
  TabParamList,
} from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createNativeBottomTabNavigator<TabParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();

const largeTitle = {
  headerLargeTitle: true,
  headerShadowVisible: false,
} as const;
const titleOptions = {
  title: '',
  headerBackButtonDisplayMode: 'minimal',
} as const;

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator>
      <DiscoverStack.Screen
        name="DiscoverHome"
        component={DiscoverScreen}
        options={{ title: 'Discover', ...largeTitle }}
      />
      <DiscoverStack.Screen
        name="Title"
        component={TitleScreen}
        options={titleOptions}
      />
      <DiscoverStack.Screen
        name="Filters"
        component={FiltersScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
    </DiscoverStack.Navigator>
  );
}

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen
        name="LibraryHome"
        component={LibraryScreen}
        options={{ title: 'Library', ...largeTitle }}
      />
      <LibraryStack.Screen
        name="Title"
        component={TitleScreen}
        options={titleOptions}
      />
      <LibraryStack.Screen
        name="Import"
        component={ImportScreen}
        options={{ title: 'Import' }}
      />
    </LibraryStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: 'Settings', ...largeTitle }}
      />
      <SettingsStack.Screen name="ApiKey" component={ApiKeyScreen} />
      <SettingsStack.Screen
        name="Region"
        component={RegionScreen}
        options={{ title: 'Region' }}
      />
      <SettingsStack.Screen
        name="Taste"
        component={TasteScreen}
        options={{ title: 'Taste' }}
      />
      <SettingsStack.Screen name="AddFacet" component={AddFacetScreen} />
    </SettingsStack.Navigator>
  );
}

function SearchNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="Title"
        component={TitleScreen}
        options={titleOptions}
      />
    </SearchStack.Navigator>
  );
}

function TabsWithSearch() {
  return (
    <View style={styles.fill}>
      <Tabs.Navigator screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="DiscoverTab"
          component={DiscoverNavigator}
          options={{
            title: 'Discover',
            tabBarIcon: {
              type: 'sfSymbol',
              name: 'play.rectangle.on.rectangle',
            },
          }}
        />
        <Tabs.Screen
          name="LibraryTab"
          component={LibraryNavigator}
          options={{
            title: 'Library',
            tabBarIcon: { type: 'sfSymbol', name: 'books.vertical' },
          }}
        />
        <Tabs.Screen
          name="SettingsTab"
          component={SettingsNavigator}
          options={{
            title: 'Settings',
            tabBarIcon: { type: 'sfSymbol', name: 'gearshape' },
          }}
        />
      </Tabs.Navigator>
      <SearchPill />
    </View>
  );
}

export function RootNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Tabs" component={TabsWithSearch} />
      <Root.Screen
        name="Search"
        component={SearchNavigator}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
