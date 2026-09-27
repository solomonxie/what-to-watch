/**
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSettingsStore } from './src/state/settingsStore';
import {
  restoreOnFreshInstall,
  startBackupScheduler,
} from './src/backup/backupService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Restore first: a backup of the still-empty app must never race it.
    restoreOnFreshInstall()
      .then(restored => {
        if (restored) useSettingsStore.getState().load();
      })
      .catch(() => {})
      .finally(startBackupScheduler);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
