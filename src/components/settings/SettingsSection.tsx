import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProviderApiKeyForm } from './ProviderApiKeyForm';
import { PlatformPreferenceToggles } from './PlatformPreferenceToggles';
import { ICloudSyncToggle } from './ICloudSyncToggle';
import { ImportExportControls } from './ImportExportControls';

export function SettingsSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Settings</Text>

      <ProviderApiKeyForm
        providerId="tmdb"
        label="TMDB"
        note="Streaming-platform rankings require a TMDB API key."
      />
      <ProviderApiKeyForm providerId="omdb" label="OMDb" />
      <ProviderApiKeyForm
        providerId="imdb"
        label="IMDb (official, paid)"
        note="Not yet implemented — key is saved for future use."
      />

      <PlatformPreferenceToggles />
      <ICloudSyncToggle />
      <ImportExportControls />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingBottom: 32, marginTop: 8 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
});
