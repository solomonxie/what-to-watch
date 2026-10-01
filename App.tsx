/**
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';
import { useSettingsStore } from './src/state/settingsStore';
import {
  restoreOnFreshInstall,
  startBackupScheduler,
} from './src/backup/backupService';
import { isDemo, useDataStore } from './src/demo/demoMode';
import { prepareDataStore } from './src/demo/dataStore';
import { startSpotlightSync } from './src/search/spotlight';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  // A swapped data store remounts every screen, so none shows the other's data.
  const generation = useDataStore(s => s.generation);
  // The demo library is seeded before any screen reads it.
  const [ready, setReady] = useState(!isDemo());

  useEffect(() => {
    if (isDemo()) {
      prepareDataStore()
        .catch(() => {})
        .finally(() => setReady(true));
    } else {
      // Restore first: a backup of the still-empty app must never race it.
      restoreOnFreshInstall()
        .then(restored => {
          if (restored) useSettingsStore.getState().load();
        })
        .catch(() => {})
        .finally(startBackupScheduler);
    }
    startSpotlightSync();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        key={generation}
        linking={linking}
        theme={isDarkMode ? DarkTheme : DefaultTheme}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
