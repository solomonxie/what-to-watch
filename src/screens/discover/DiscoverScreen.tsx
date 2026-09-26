import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PLATFORMS, DEFAULT_REGION } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';
import {
  applyFilters,
  countActiveFilters,
  sortTitles,
  useFilterStore,
} from '../../state/filterStore';
import {
  refreshPlatformRanking,
  refreshSearchIndex,
} from '../../catalog/catalogService';
import { isProviderActive } from '../../providers/providerRegistry';
import {
  Chip,
  ChipRow,
  EmptyState,
  PosterGrid,
  SectionLabel,
} from '../../ui/components';
import { joinMeta, mediaLabel, score10 } from '../../ui/format';
import { useColors } from '../../ui/theme';
import { SearchResults } from './SearchResults';
import type { DiscoverStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHome'>;
type Rows = Awaited<ReturnType<typeof refreshPlatformRanking>>;
type Load = 'loading' | 'error' | 'noKey' | 'ready';

export function DiscoverScreen({ navigation }: Props) {
  const c = useColors();
  const { settings, load: loadSettings } = useSettingsStore();
  const { filters, sort, resetFilters } = useFilterStore();
  const [query, setQuery] = useState('');
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [rows, setRows] = useState<Rows>([]);
  const [state, setState] = useState<Load>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const region = settings?.defaultRegion ?? DEFAULT_REGION;
  const platforms = PLATFORMS.filter(p =>
    settings?.enabledPlatformIds.includes(p.id),
  );
  const platform = platforms.find(p => p.id === platformId) ?? platforms[0];
  const activeFilters =
    countActiveFilters(filters) + (sort.key !== 'popularity' ? 1 : 0);

  useEffect(() => {
    loadSettings();
    refreshSearchIndex();
  }, [loadSettings]);

  const load = useCallback(
    async (force = false) => {
      if (!platform) return;
      if (!(await isProviderActive('tmdb'))) {
        setState('noKey');
        return;
      }
      if (!force) setState(prev => (prev === 'ready' ? prev : 'loading'));
      try {
        setRows(await refreshPlatformRanking(platform, region, force));
        setState('ready');
      } catch {
        setState('error');
      }
    },
    [platform, region],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Movies, shows, cast',
        hideWhenScrolling: false,
        autoCapitalize: 'none',
        onChangeText: e => setQuery(e.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
      },
      // React Navigation's header API takes a render function.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Filters')} hitSlop={8}>
          <Text style={[styles.headerButton, { color: c.accent }]}>
            {activeFilters ? `Filters · ${activeFilters}` : 'Filters'}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, activeFilters, c.accent]);

  const items = useMemo(() => {
    const withMeta = rows.map(r => ({
      title: { ...r.title, rank: r.rank },
      watchCount: 0,
    }));
    return sortTitles(applyFilters(withMeta, filters), sort).map(
      ({ title }) => ({
        id: title.id,
        title: title.title,
        posterPath: title.posterPath,
        badge: String(title.rank),
        meta: joinMeta([
          score10(title.primaryRatingScore) &&
            `★ ${score10(title.primaryRatingScore)}`,
          mediaLabel(title.mediaType),
        ]),
      }),
    );
  }, [rows, filters, sort]);

  const openTitle = (titleId: string) =>
    navigation.navigate('Title', { titleId });
  const goSettings = (screen: 'ApiKey' | 'SettingsHome') =>
    navigation.getParent()?.navigate('SettingsTab', {
      screen,
      params: screen === 'ApiKey' ? { providerId: 'tmdb' } : undefined,
    });

  if (query.trim()) {
    return <SearchResults query={query} region={region} onOpen={openTitle} />;
  }

  let body: React.ReactNode;
  if (!platform) {
    body = (
      <EmptyState
        message="Pick your services in Settings."
        action="Choose"
        onAction={() => goSettings('SettingsHome')}
      />
    );
  } else if (state === 'noKey') {
    body = (
      <EmptyState
        message="Connect TMDB to see what's streaming."
        action="Connect"
        onAction={() => goSettings('ApiKey')}
      />
    );
  } else if (state === 'loading') {
    body = <EmptyState loading />;
  } else if (state === 'error') {
    body = (
      <EmptyState
        message={`Couldn't load ${platform.name}.`}
        action="Try again"
        onAction={() => load(true)}
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        message="Nothing matches your filters."
        action="Clear filters"
        onAction={resetFilters}
      />
    );
  } else {
    body = <PosterGrid items={items} onPress={openTitle} />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {platforms.length > 0 ? (
        <ChipRow scroll>
          {platforms.map(p => (
            <Chip
              key={p.id}
              label={p.name}
              selected={p.id === platform?.id}
              onPress={() => setPlatformId(p.id)}
            />
          ))}
        </ChipRow>
      ) : null}
      {platform ? (
        <SectionLabel>{`Most popular · ${region}`}</SectionLabel>
      ) : null}
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17 },
});
