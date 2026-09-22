import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRatingsForTitle } from '../../db/repositories/titlesRepo';

interface Rating {
  source: string;
  rawValue: number;
  scale: string;
}

interface Props {
  titleId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  tmdb: 'TMDB',
  imdb: 'IMDb',
  rotten_tomatoes: 'Rotten Tomatoes',
  metacritic: 'Metacritic',
};

export function ExternalReviewsSection({ titleId }: Props) {
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    (async () => {
      const rows = await getRatingsForTitle(titleId);
      setRatings(rows);
    })();
  }, [titleId]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Internet Reviews &amp; Ratings</Text>
      {ratings.length === 0 ? (
        <Text style={styles.empty}>
          No fetched ratings yet for this title.
        </Text>
      ) : (
        <View style={styles.badges}>
          {ratings.map((r, i) => (
            <View key={i} style={styles.badge}>
              <Text style={styles.badgeSource}>
                {SOURCE_LABELS[r.source] ?? r.source}
              </Text>
              <Text style={styles.badgeValue}>
                {r.rawValue}
                {r.scale === 'percent' ? '%' : r.scale === '0-10' ? '/10' : '/100'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 20 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#888', fontSize: 13 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: '#f5f5f5', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  badgeSource: { fontSize: 11, color: '#888' },
  badgeValue: { fontSize: 15, fontWeight: '700' },
});
