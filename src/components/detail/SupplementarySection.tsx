import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getWatchProvidersForTitle } from '../../db/repositories/titlesRepo';

interface Props {
  titleId: string;
  region: string;
}

const TYPE_SUFFIX: Record<string, string> = {
  rent: ' (rent)',
  buy: ' (buy)',
  free: ' (free)',
};

export function SupplementarySection({ titleId, region }: Props) {
  const [platforms, setPlatforms] = useState<
    Array<{ platformName: string; availabilityType: string }>
  >([]);

  useEffect(() => {
    (async () => {
      const rows = await getWatchProvidersForTitle(titleId);
      setPlatforms(rows.filter(r => r.region === region));
    })();
  }, [titleId, region]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Where to Watch ({region})</Text>
      {platforms.length === 0 ? (
        <Text style={styles.empty}>No streaming availability cached yet.</Text>
      ) : (
        <View style={styles.badges}>
          {platforms.map((p, i) => (
            <View key={i} style={styles.badge}>
              <Text style={styles.badgeText}>
                {p.platformName}
                {TYPE_SUFFIX[p.availabilityType] ?? ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 32 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#888', fontSize: 13 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#333',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
});
