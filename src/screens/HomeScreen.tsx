import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecentlyWatchedSection } from '../components/home/RecentlyWatchedSection';
import { MyRatingsSection } from '../components/home/MyRatingsSection';
import { PlatformSection } from '../components/home/PlatformSection';
import { FiltersEntryPoint } from '../components/home/FiltersEntryPoint';
import { SettingsSection } from '../components/settings/SettingsSection';
import { PersistentSearchBar } from '../components/search/PersistentSearchBar';
import { PLATFORMS } from '../config/platforms';
import { useSettingsStore } from '../state/settingsStore';
import { getAllCachedTitles } from '../db/repositories/titlesRepo';
import { buildSearchIndex } from '../search/fuseIndex';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { settings, load } = useSettingsStore();

  useEffect(() => {
    load();
    (async () => {
      const cached = await getAllCachedTitles();
      buildSearchIndex(cached);
    })();
  }, [load]);

  const onSelectTitle = (titleId: string) => {
    navigation.navigate('ShowDetail', { titleId });
  };

  const enabledPlatforms = PLATFORMS.filter(p =>
    (settings?.enabledPlatformIds ?? []).includes(p.id),
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RecentlyWatchedSection onSelectTitle={onSelectTitle} />
        <MyRatingsSection onSelectTitle={onSelectTitle} />
        <FiltersEntryPoint />
        {enabledPlatforms.map(platform => (
          <PlatformSection
            key={platform.id}
            platform={platform}
            onSelectTitle={onSelectTitle}
          />
        ))}
        <SettingsSection />
      </ScrollView>
      <PersistentSearchBar onSelectTitle={onSelectTitle} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  scrollContent: { paddingTop: 16, paddingBottom: 16 },
});
