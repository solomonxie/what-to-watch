/**
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSettingsStore } from './src/state/settingsStore';
import { restoreOnFreshInstall, startBackupScheduler } from './src/backup/backupService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    startBackupScheduler();
    restoreOnFreshInstall()
      .then(restored => {
        if (restored) useSettingsStore.getState().load();
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
