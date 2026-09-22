import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getPlatformRanking } from '../../db/repositories/rankingsRepo';
import { isProviderActive } from '../../providers/providerRegistry';
import { PlatformRankingRow } from './PlatformRankingRow';
import { DEFAULT_REGION } from '../../config/platforms';
import type { PlatformConfig } from '../../config/platforms';

interface Props {
  platform: PlatformConfig;
  onSelectTitle: (titleId: string) => void;
}

export function PlatformSection({ platform, onSelectTitle }: Props) {
  const [tmdbConfigured, setTmdbConfigured] = useState<boolean | null>(null);
  const [popular, setPopular] = useState<
    Array<{ id: string; title: string; posterPath: string | null; rank: number }>
  >([]);

  useEffect(() => {
    (async () => {
      const configured = await isProviderActive('tmdb');
      setTmdbConfigured(configured);
      if (!configured) return;
      const rows = await getPlatformRanking(platform.id, DEFAULT_REGION, 'popular');
      setPopular(
        rows.map(row => ({
          id: row.title.id,
          title: row.title.title,
          posterPath: row.title.posterPath,
          rank: row.rank,
        })),
      );
    })();
  }, [platform.id]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{platform.name}</Text>
      {tmdbConfigured === false ? (
        <Text style={styles.empty}>
          Add a TMDB API key in Settings to see {platform.name} rankings.
        </Text>
      ) : popular.length === 0 ? (
        <Text style={styles.empty}>No ranking data cached yet.</Text>
      ) : (
        <PlatformRankingRow
          label="Most Popular"
          items={popular}
          onSelectTitle={onSelectTitle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24, paddingHorizontal: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#888', fontSize: 13 },
});
