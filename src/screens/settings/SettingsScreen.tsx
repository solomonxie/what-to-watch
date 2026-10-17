import React, { useCallback, useState } from 'react';
import {
  Alert,
  DevSettings,
  Image,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getApiKey } from '../../secureStorage/apiKeyStore';
import { PLATFORMS, DEFAULT_REGION } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';
import { usePrefsStore } from '../../prefs/prefsStore';
import { BOTTOM_CLEARANCE, GroupedSection, Row } from '../../ui/components';
import { useColors } from '../../ui/theme';
import { ICloudRow } from './ICloudRow';
import { CsvImportRow } from './CsvImportRow';
import { CSV_COLUMNS } from '../../libraryImport/formats';
import { useImportExport } from './useImportExport';
import { isDemo, useDataStore } from '../../demo/demoMode';
import { resetDemoData, switchDataStore } from '../../demo/dataStore';
import type { SettingsStackParamList } from '../../navigation/types';
import { genreLabel } from '../../config/taxonomy';
import { getLanguage, saveLanguage, t, type Language } from '../../i18n';

const LANGUAGE_NAMES: Record<Language, string> = {
  system: t('System'),
  en: 'English',
  zh: '中文',
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

const BACKUP_MORE = t(
  'iCloud Drive keeps a copy for each of the last 30 days, then one a month for a year. It survives deleting the app, and a reinstall restores the newest copy that has your marks. A smaller backup never replaces a fuller one from the same day. This iPhone also keeps a copy after every change for 7 days, for undoing mistakes. API keys never leave this device.',
);

const DEMO_FOOTER = t(
  'A sample library for trying features and taking screenshots. It lives in its own database: nothing done in demo mode touches your data or backups.',
);

const CSV_MORE =
  t(
    'The CSV row takes any CSV with a header row and these columns, in any order, only title required (Chinese headers work too):',
  ) +
  '\n' +
  CSV_COLUMNS.map(c => `• ${c}`).join('\n') +
  '\n' +
  t(
    'IMDb rows match exactly by their IMDb id. IMDb and Letterboxd keep ratings and watchlist in separate files; import each.',
  );

export function SettingsScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, load, togglePlatform } = useSettingsStore();
  const [keys, setKeys] = useState({ tmdb: false, omdb: false });
  const { exportCopy, importFile, busy } = useImportExport();
  const { prefs, load: loadPrefs } = usePrefsStore();
  useDataStore(s => s.generation);
  const [language, setLanguage] = useState(getLanguage());
  const pickLanguage = () =>
    Alert.alert(t('Language'), undefined, [
      ...(Object.keys(LANGUAGE_NAMES) as Language[]).map(l => ({
        text: LANGUAGE_NAMES[l],
        onPress: async () => {
          if (l === language) return;
          await saveLanguage(l);
          setLanguage(l);
          Alert.alert(t('Restart to apply the language'), undefined, [
            { text: t('Later'), style: 'cancel' },
            { text: t('Restart'), onPress: () => DevSettings.reload() },
          ]);
        },
      })),
      { text: t('Cancel'), style: 'cancel' },
    ]);
  const demo = isDemo();
  const [switching, setSwitching] = useState(false);

  const swap = (work: () => Promise<void>) => {
    setSwitching(true);
    work()
      .catch(e => Alert.alert(t("Couldn't switch data"), String(e)))
      .finally(() => setSwitching(false));
  };
  const setDemo = (on: boolean) => swap(() => switchDataStore(on));
  const confirmReset = () =>
    Alert.alert(
      t('Reset demo data?'),
      t('Undoes every change made in demo mode.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Reset'),
          style: 'destructive',
          onPress: () => swap(resetDemoData),
        },
      ],
    );

  useFocusEffect(
    useCallback(() => {
      if (!settings) load();
      loadPrefs();
      Promise.all([getApiKey('tmdb'), getApiKey('omdb')]).then(([tm, o]) =>
        setKeys({ tmdb: !!tm, omdb: !!o }),
      );
    }, [settings, load, loadPrefs]),
  );

  const enabled = new Set(settings?.enabledPlatformIds ?? []);
  const tasteSummary = prefs?.genres.length
    ? prefs.genres.slice(0, 2).map(genreLabel).join(', ') +
      (prefs.genres.length > 2 ? ', …' : '')
    : t('Not set');

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
          value={keys.tmdb ? t('Connected') : t('Not set')}
          onPress={() => navigation.navigate('ApiKey', { providerId: 'tmdb' })}
        />
        <Row
          label="OMDb"
          value={keys.omdb ? t('Connected') : t('Not set')}
          onPress={() => navigation.navigate('ApiKey', { providerId: 'omdb' })}
        />
      </GroupedSection>

      <GroupedSection header={t('Language')}>
        <Row
          label={t('Language')}
          value={LANGUAGE_NAMES[language]}
          onPress={pickLanguage}
        />
      </GroupedSection>

      <GroupedSection header={t('Streaming')}>
        <Row
          label={t('Region')}
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
        header={t('Taste')}
        footer={t(
          "Set tastes to turn Discover into picks for you. Leave empty for what's popular.",
        )}
      >
        <Row
          label={t('Taste')}
          value={tasteSummary}
          onPress={() => navigation.navigate('Taste')}
        />
      </GroupedSection>

      <GroupedSection
        header={t('Import data')}
        footer={t('Ratings and watch history from other apps.')}
        more={CSV_MORE}
      >
        <CsvImportRow
          label={t('IMDb CSV…')}
          hint={t(
            'Official export: imdb.com → Your Ratings or Watchlist → ⋮ → Export',
          )}
          format="IMDb"
          source="IMDb"
        />
        <CsvImportRow
          label={t('Letterboxd CSV…')}
          hint={t(
            'letterboxd.com → Settings → Data → Export; pick ratings.csv, watched.csv or watchlist.csv from the unzipped folder',
          )}
          format="Letterboxd"
          source="Letterboxd"
        />
        <CsvImportRow
          label={t('Other CSV…')}
          hint={t(
            'Any CSV with a title column; year, IMDb id, rating, review and date are optional — see More',
          )}
          format="CSV"
          source="CSV"
        />
      </GroupedSection>

      <GroupedSection
        header={t('Backup')}
        footer={t('Your ratings, reviews, notes and watch history.')}
        more={BACKUP_MORE}
      >
        {demo ? null : <ICloudRow />}
        <Row
          label={t('Export a copy…')}
          onPress={busy ? undefined : exportCopy}
        />
        <Row
          label={t('Import from file…')}
          onPress={busy ? undefined : importFile}
        />
      </GroupedSection>

      <GroupedSection header={t('Demo')} footer={DEMO_FOOTER}>
        <Row
          label={t('Demo mode')}
          toggle={{ value: demo, onChange: setDemo, disabled: switching }}
        />
        {demo ? (
          <Row
            label={t('Reset demo data')}
            destructive
            onPress={switching ? undefined : confirmReset}
          />
        ) : null}
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: BOTTOM_CLEARANCE },
});
