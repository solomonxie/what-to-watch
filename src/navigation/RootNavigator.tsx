import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { FiltersScreen } from '../screens/discover/FiltersScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { LibrarySectionScreen } from '../screens/library/LibrarySectionScreen';
import { TitleScreen } from '../screens/title/TitleScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ApiKeyScreen } from '../screens/settings/ApiKeyScreen';
import { RegionScreen } from '../screens/settings/RegionScreen';
import { ICloudBackupsScreen } from '../screens/settings/ICloudBackupsScreen';
import { TasteScreen } from '../screens/taste/TasteScreen';
import { AddFacetScreen } from '../screens/taste/AddFacetScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { SearchTabButton } from '../screens/search/SearchTabButton';
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
        options={{ title: 'What to Watch', ...largeTitle }}
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
        options={({ navigation }) => ({
          title: 'Library',
          ...largeTitle,
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Settings',
              icon: { type: 'sfSymbol', name: 'gearshape' },
              onPress: () =>
                navigation
                  .getParent<NavigationProp<RootStackParamList>>('Root')
                  ?.navigate('Settings', { screen: 'SettingsHome' }),
            },
          ],
        })}
      />
      <LibraryStack.Screen
        name="LibrarySection"
        component={LibrarySectionScreen}
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
        options={({ navigation }) => ({
          title: 'Settings',
          ...largeTitle,
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Done',
              labelStyle: { fontWeight: '600' },
              onPress: () => navigation.getParent()?.goBack(),
            },
          ],
        })}
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
      <SettingsStack.Screen
        name="ICloudBackups"
        component={ICloudBackupsScreen}
        options={{ title: 'iCloud Backups' }}
      />
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

function TabsNavigator() {
  return (
    <View style={styles.fill}>
      <Tabs.Navigator
        backBehavior="history"
        screenOptions={{ headerShown: false }}
      >
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
          name="SearchTab"
          component={SearchNavigator}
          options={{
            title: 'Search',
            // SearchTabButton draws the big icon over this item.
            tabBarLabel: '',
            tabBarIcon: {
              type: 'image',
              source: require('../assets/tab-blank.png'),
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
      </Tabs.Navigator>
      <SearchTabButton />
    </View>
  );
}

export function RootNavigator() {
  return (
    <Root.Navigator id="Root" screenOptions={{ headerShown: false }}>
      <Root.Screen name="Tabs" component={TabsNavigator} />
      <Root.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ presentation: 'modal' }}
      />
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
