import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProviderApiKeyForm } from './ProviderApiKeyForm';
import { PlatformPreferenceToggles } from './PlatformPreferenceToggles';
import { ICloudSyncToggle } from './ICloudSyncToggle';
import { ImportExportControls } from './ImportExportControls';

const BACKUP_INFO =
  'Your ratings, reviews, notes and watch history. API keys never leave this device, including in backups. A daily copy is also kept in Files → On My iPhone → What to Watch.';

function showBackupInfo() {
  Alert.alert('Backup', BACKUP_INFO);
}

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
      <View style={styles.backupHeader}>
        <Text style={styles.backupHeading}>Backup</Text>
        <Pressable onPress={showBackupInfo} hitSlop={12}>
          <Text style={styles.info}>ⓘ</Text>
        </Pressable>
      </View>
      <ICloudSyncToggle />
      <ImportExportControls />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingBottom: 32, marginTop: 8 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  backupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  backupHeading: { fontSize: 15, fontWeight: '600' },
  info: { fontSize: 15, color: '#007aff' },
});
