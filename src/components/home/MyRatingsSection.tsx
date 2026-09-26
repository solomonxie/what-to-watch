import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAllUserRatings } from '../../db/repositories/ratingsRepo';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import { TitleCard } from '../title/TitleCard';

interface Props {
  refreshKey: number;
  onSelectTitle: (titleId: string) => void;
}

export function MyRatingsSection({ refreshKey, onSelectTitle }: Props) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      title: string;
      posterPath: string | null;
      rating: number;
    }>
  >([]);

  useEffect(() => {
    (async () => {
      const ratings = await getAllUserRatings();
      const titles = await getTitlesByIds(ratings.map(r => r.titleId));
      const byId = new Map(titles.map(t => [t.id, t]));
      setItems(
        ratings
          .map(r => {
            const title = byId.get(r.titleId);
            return title ? { ...title, rating: r.rating } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      );
    })();
  }, [refreshKey]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>My Ratings &amp; Reviews</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>
          Rate a title from its detail page to see it here.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items.map(item => (
            <TitleCard
              key={item.id}
              title={item.title}
              posterPath={item.posterPath ?? undefined}
              ratingLabel={`${item.rating.toFixed(1)} ★`}
              onPress={() => onSelectTitle(item.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24, paddingHorizontal: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#888', fontSize: 13 },
});
