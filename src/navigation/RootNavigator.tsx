import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { FiltersScreen } from '../screens/discover/FiltersScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { TitleScreen } from '../screens/title/TitleScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ApiKeyScreen } from '../screens/settings/ApiKeyScreen';
import { RegionScreen } from '../screens/settings/RegionScreen';
import type {
  DiscoverStackParamList,
  LibraryStackParamList,
  SettingsStackParamList,
  TabParamList,
} from './types';

const Tabs = createNativeBottomTabNavigator<TabParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

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
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
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
    </SettingsStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="DiscoverTab"
        component={DiscoverNavigator}
        options={{
          title: 'Discover',
          tabBarIcon: { type: 'sfSymbol', name: 'play.rectangle.on.rectangle' },
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
  );
}
