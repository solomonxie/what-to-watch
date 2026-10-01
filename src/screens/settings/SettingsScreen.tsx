import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getApiKey } from '../../secureStorage/apiKeyStore';
import { PLATFORMS, DEFAULT_REGION } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';
import { usePrefsStore } from '../../prefs/prefsStore';
import { FLOATING_CLEARANCE, GroupedSection, Row } from '../../ui/components';
import { useColors } from '../../ui/theme';
import { ICloudRow } from './ICloudRow';
import { CsvImportRow } from './CsvImportRow';
import { CSV_COLUMNS } from '../../libraryImport/formats';
import { useImportExport } from './useImportExport';
import { isDemo, useDataStore } from '../../demo/demoMode';
import { resetDemoData, switchDataStore } from '../../demo/dataStore';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

const BACKUP_MORE =
  'iCloud Drive keeps a copy for each of the last 30 days, then one a month for a year. It survives deleting the app, and a reinstall restores the newest copy that has your marks. A smaller backup never replaces a fuller one from the same day. This iPhone also keeps a copy after every change for 7 days, for undoing mistakes. API keys never leave this device.';

const DEMO_FOOTER =
  'A sample library for trying features and taking screenshots. It lives in its own database: nothing done in demo mode touches your data or backups.';

const CSV_MORE =
  'Douban has no export, so its row takes a CSV made by scripts/douban-export.py in the app repo — or any CSV with a header row and these columns, in any order, only title required:\n' +
  CSV_COLUMNS.map(c => `• ${c}`).join('\n') +
  '\nIMDb rows match exactly by their IMDb id; your ratings and watchlist are separate exports, import both.';

export function SettingsScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, load, togglePlatform } = useSettingsStore();
  const [keys, setKeys] = useState({ tmdb: false, omdb: false });
  const { exportCopy, importFile, busy } = useImportExport();
  const { prefs, load: loadPrefs } = usePrefsStore();
  useDataStore(s => s.generation);
  const demo = isDemo();
  const [switching, setSwitching] = useState(false);

  const swap = (work: () => Promise<void>) => {
    setSwitching(true);
    work()
      .catch(e => Alert.alert("Couldn't switch data", String(e)))
      .finally(() => setSwitching(false));
  };
  const setDemo = (on: boolean) => swap(() => switchDataStore(on));
  const confirmReset = () =>
    Alert.alert('Reset demo data?', 'Undoes every change made in demo mode.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => swap(resetDemoData),
      },
    ]);

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
        footer="TMDB powers search and rankings. OMDb adds IMDb & Rotten Tomatoes ratings. This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability by JustWatch."
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

      <GroupedSection
        header="Import data"
        footer="Ratings and watch history from other apps."
        more={CSV_MORE}
      >
        <CsvImportRow
          label="IMDb CSV…"
          hint="Official export: imdb.com → Your Ratings or Watchlist → ⋮ → Export"
          format="IMDb"
          source="IMDb"
        />
        <CsvImportRow
          label="Douban CSV…"
          hint="Made with scripts/douban-export.py, or any CSV with a title column"
          format="CSV"
          source="Douban"
        />
      </GroupedSection>

      <GroupedSection
        header="Backup"
        footer="Your ratings, reviews, notes and watch history."
        more={BACKUP_MORE}
      >
        {demo ? null : <ICloudRow />}
        <Row label="Export a copy…" onPress={busy ? undefined : exportCopy} />
        <Row
          label="Import from file…"
          onPress={busy ? undefined : importFile}
        />
      </GroupedSection>

      <GroupedSection header="Demo" footer={DEMO_FOOTER}>
        <Row
          label="Demo mode"
          toggle={{ value: demo, onChange: setDemo, disabled: switching }}
        />
        {demo ? (
          <Row
            label="Reset demo data"
            destructive
            onPress={switching ? undefined : confirmReset}
          />
        ) : null}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: FLOATING_CLEARANCE },
});
