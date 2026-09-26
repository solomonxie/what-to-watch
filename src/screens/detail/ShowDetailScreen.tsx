import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTitleById } from '../../db/repositories/titlesRepo';
import { MetadataSection } from '../../components/detail/MetadataSection';
import { NotesSection } from '../../components/detail/NotesSection';
import { UserRatingReviewSection } from '../../components/detail/UserRatingReviewSection';
import { ExternalReviewsSection } from '../../components/detail/ExternalReviewsSection';
import { SupplementarySection } from '../../components/detail/SupplementarySection';
import { WatchStatusSection } from '../../components/detail/WatchStatusSection';
import { fetchAndCacheTitle, parseTitleId } from '../../catalog/catalogService';
import { isProviderActive } from '../../providers/providerRegistry';
import { useSettingsStore } from '../../state/settingsStore';
import { DEFAULT_REGION } from '../../config/platforms';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ShowDetail'>;
type CachedTitle = Awaited<ReturnType<typeof getTitleById>>;

export function ShowDetailScreen({ route }: Props) {
  const { titleId } = route.params;
  const region = useSettingsStore(
    st => st.settings?.defaultRegion ?? DEFAULT_REGION,
  );
  const [title, setTitle] = useState<CachedTitle | undefined>(undefined);
  const [status, setStatus] = useState<
    'loading' | 'fetching' | 'error' | 'ready'
  >('loading');
  // Bumped after a fetch so child sections re-read the cache.
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const cached = await getTitleById(titleId);
    setTitle(cached);
    setStatus(cached ? 'ready' : 'fetching');

    // Rows from platform rankings lack cast/availability; complete them once.
    const needsFetch = !cached || cached.castNames == null;
    const ref = parseTitleId(titleId);
    if (!needsFetch || !ref || !(await isProviderActive('tmdb'))) {
      if (!cached) setStatus('error');
      return;
    }
    try {
      await fetchAndCacheTitle(ref.tmdbId, ref.mediaType, region);
      setTitle(await getTitleById(titleId));
      setStatus('ready');
      setVersion(v => v + 1);
    } catch {
      if (!cached) setStatus('error');
    }
  }, [titleId, region]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading' || status === 'fetching') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        {status === 'fetching' ? (
          <Text style={styles.loading}>Fetching details…</Text>
        ) : null}
      </View>
    );
  }

  if (!title) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>⚠ Couldn't load this title.</Text>
        <Pressable onPress={load} hitSlop={8}>
          <Text style={styles.link}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <MetadataSection
        title={title.title}
        overview={title.overview}
        posterPath={title.posterPath}
        releaseDate={title.releaseDate}
        runtimeMinutes={title.runtimeMinutes}
        genres={title.genres}
        mediaType={title.mediaType}
        originCountries={title.originCountries}
        originalLanguage={title.originalLanguage}
        castNames={title.castNames}
      />
      <WatchStatusSection titleId={titleId} />
      <NotesSection titleId={titleId} />
      <UserRatingReviewSection titleId={titleId} />
      <ExternalReviewsSection key={`r${version}`} titleId={titleId} />
      <SupplementarySection
        key={`s${version}`}
        titleId={titleId}
        region={region}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loading: { textAlign: 'center', color: '#888' },
  link: { color: '#007aff', fontWeight: '600' },
});
