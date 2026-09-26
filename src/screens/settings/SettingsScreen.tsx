import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getApiKey } from '../../secureStorage/apiKeyStore';
import { PLATFORMS, DEFAULT_REGION } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';
import { usePrefsStore } from '../../prefs/prefsStore';
import { FLOATING_CLEARANCE, GroupedSection, Row } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import { ICloudRow } from './ICloudRow';
import { useImportExport } from './useImportExport';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

const BACKUP_INFO =
  'Your ratings, reviews, notes and watch history. API keys never leave this device, including in backups. A daily copy is also kept in Files → On My iPhone → What to Watch.';

export function SettingsScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, load, togglePlatform } = useSettingsStore();
  const [keys, setKeys] = useState({ tmdb: false, omdb: false });
  const { exportCopy, importFile, busy } = useImportExport();
  const { prefs, load: loadPrefs } = usePrefsStore();

  useFocusEffect(
    useCallback(() => {
      if (!settings) load();
      loadPrefs();
      Promise.all([getApiKey('tmdb'), getApiKey('omdb')]).then(([t, o]) =>
        setKeys({ tmdb: !!t, omdb: !!o }),
      );
    }, [settings, load, loadPrefs]),
  );

  const enabled = new Set(settings?.enabledPlatformIds ?? []);
  const tasteSummary = prefs?.genres.length
    ? prefs.genres.slice(0, 2).join(', ') +
      (prefs.genres.length > 2 ? ', …' : '')
    : 'Not set';

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <GroupedSection
        header="Data sources"
        footer="TMDB powers search and rankings. OMDb adds IMDb & Rotten Tomatoes ratings."
      >
        <Row
          label="TMDB"
          value={keys.tmdb ? 'Connected' : 'Not set'}
          onPress={() => navigation.navigate('ApiKey', { providerId: 'tmdb' })}
        />
        <Row
          label="OMDb"
          value={keys.omdb ? 'Connected' : 'Not set'}
          onPress={() => navigation.navigate('ApiKey', { providerId: 'omdb' })}
        />
      </GroupedSection>

      <GroupedSection header="Streaming">
        <Row
          label="Region"
          value={settings?.defaultRegion ?? DEFAULT_REGION}
          onPress={() => navigation.navigate('Region')}
        />
        {PLATFORMS.map(p => (
          <Row
            key={p.id}
            label={p.name}
            toggle={{
              value: enabled.has(p.id),
              onChange: () => togglePlatform(p.id),
            }}
          />
        ))}
      </GroupedSection>

      <GroupedSection
        header="Taste"
        footer="Set tastes to turn Discover into picks for you. Leave empty for what's popular."
      >
        <Row
          label="Taste"
          value={tasteSummary}
          onPress={() => navigation.navigate('Taste')}
        />
      </GroupedSection>

      <View style={styles.backupHeader}>
        <Text style={[type.section, { color: c.secondary }]}>BACKUP</Text>
        <Pressable
          onPress={() => Alert.alert('Backup', BACKUP_INFO)}
          hitSlop={12}
        >
          <Text style={[type.section, { color: c.accent }]}>ⓘ</Text>
        </Pressable>
      </View>
      <GroupedSection>
        <ICloudRow />
        <Row label="Export a copy…" onPress={busy ? undefined : exportCopy} />
        <Row
          label="Import from file…"
          onPress={busy ? undefined : importFile}
        />
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: FLOATING_CLEARANCE },
  backupHeader: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: space.l * 2,
    marginTop: space.xl,
    marginBottom: space.s,
  },
});
