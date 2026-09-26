import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isProviderActive } from '../../providers/providerRegistry';
import { refreshPlatformRanking } from '../../catalog/catalogService';
import { getWatchCounts } from '../../db/repositories/watchHistoryRepo';
import {
  applyFilters,
  sortTitles,
  useFilterStore,
} from '../../state/filterStore';
import { PlatformRankingRow } from './PlatformRankingRow';
import type { PlatformConfig } from '../../config/platforms';

type RankingRows = Awaited<ReturnType<typeof refreshPlatformRanking>>;

type LoadState =
  | { kind: 'noKey' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; rows: RankingRows; watchCounts: Map<string, number> };

interface Props {
  platform: PlatformConfig;
  region: string;
  refreshKey: number;
  onSelectTitle: (titleId: string) => void;
}

export function PlatformSection({
  platform,
  region,
  refreshKey,
  onSelectTitle,
}: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const { filters, sort, resetFilters } = useFilterStore();

  const load = useCallback(
    async (force: boolean) => {
      if (!(await isProviderActive('tmdb'))) {
        setState({ kind: 'noKey' });
        return;
      }
      setState(prev =>
        prev.kind === 'ready' && !force ? prev : { kind: 'loading' },
      );
      try {
        const [rows, watchCounts] = await Promise.all([
          refreshPlatformRanking(platform, region, force),
          getWatchCounts(),
        ]);
        setState({ kind: 'ready', rows, watchCounts });
      } catch {
        setState({ kind: 'error' });
      }
    },
    [platform, region],
  );

  useEffect(() => {
    load(false);
  }, [load, refreshKey]);

  const items = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const withMeta = state.rows.map(row => ({
      title: { ...row.title, rank: row.rank },
      watchCount: state.watchCounts.get(row.title.id) ?? 0,
    }));
    return sortTitles(applyFilters(withMeta, filters), sort).map(
      ({ title }) => ({
        id: title.id,
        title: title.title,
        posterPath: title.posterPath,
        rank: title.rank,
      }),
    );
  }, [state, filters, sort]);

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{platform.name}</Text>
        {state.kind === 'ready' || state.kind === 'error' ? (
          <Pressable onPress={() => load(true)} hitSlop={8}>
            <Text style={styles.link}>⟳</Text>
          </Pressable>
        ) : null}
      </View>
      {state.kind === 'noKey' ? (
        <Text style={styles.empty}>
          Add a TMDB API key in Settings to see {platform.name} rankings.
        </Text>
      ) : state.kind === 'loading' ? (
        <View style={styles.inline}>
          <ActivityIndicator size="small" />
          <Text style={styles.empty}>Loading {platform.name}…</Text>
        </View>
      ) : state.kind === 'error' ? (
        <View style={styles.inline}>
          <Text style={styles.empty}>
            ⚠ Couldn't load {platform.name} rankings.
          </Text>
          <Pressable onPress={() => load(true)} hitSlop={8}>
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.inline}>
          <Text style={styles.empty}>
            No {platform.name} titles match your filters.
          </Text>
          <Pressable onPress={resetFilters} hitSlop={8}>
            <Text style={styles.link}>Reset filters</Text>
          </Pressable>
        </View>
      ) : (
        <PlatformRankingRow
          label="Most Popular"
          items={items}
          onSelectTitle={onSelectTitle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24, paddingHorizontal: 16 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: { fontSize: 18, fontWeight: '700' },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  empty: { color: '#888', fontSize: 13 },
  link: { color: '#007aff', fontWeight: '600', fontSize: 15 },
});
