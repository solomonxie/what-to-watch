import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecentlyWatchedSection } from '../components/home/RecentlyWatchedSection';
import { MyRatingsSection } from '../components/home/MyRatingsSection';
import { PlatformSection } from '../components/home/PlatformSection';
import { FiltersEntryPoint } from '../components/home/FiltersEntryPoint';
import { SettingsSection } from '../components/settings/SettingsSection';
import { PersistentSearchBar } from '../components/search/PersistentSearchBar';
import { SearchResultsOverlay } from '../components/search/SearchResultsOverlay';
import { DEFAULT_REGION, PLATFORMS } from '../config/platforms';
import { useSettingsStore } from '../state/settingsStore';
import { refreshSearchIndex } from '../catalog/catalogService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { settings, load } = useSettingsStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const region = settings?.defaultRegion ?? DEFAULT_REGION;

  useEffect(() => {
    load();
    refreshSearchIndex();
  }, [load]);

  // Sections reload when returning from Show Detail (new rating, watch, cache).
  useFocusEffect(useCallback(() => setRefreshKey(k => k + 1), []));

  const onSelectTitle = (titleId: string) => {
    setQuery('');
    navigation.navigate('ShowDetail', { titleId });
  };

  const enabledPlatforms = PLATFORMS.filter(p =>
    (settings?.enabledPlatformIds ?? []).includes(p.id),
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <RecentlyWatchedSection
            refreshKey={refreshKey}
            onSelectTitle={onSelectTitle}
          />
          <MyRatingsSection
            refreshKey={refreshKey}
            onSelectTitle={onSelectTitle}
          />
          <FiltersEntryPoint />
          {enabledPlatforms.map(platform => (
            <PlatformSection
              key={platform.id}
              platform={platform}
              region={region}
              refreshKey={refreshKey}
              onSelectTitle={onSelectTitle}
            />
          ))}
          <SettingsSection />
        </ScrollView>
        {query.trim() ? (
          <SearchResultsOverlay
            query={query}
            region={region}
            onSelectTitle={onSelectTitle}
          />
        ) : null}
      </View>
      <PersistentSearchBar
        query={query}
        onChangeQuery={setQuery}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  body: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 16 },
});
