import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRecentlyWatched } from '../../db/repositories/watchHistoryRepo';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import { TitleCard } from '../title/TitleCard';

interface Props {
  onSelectTitle: (titleId: string) => void;
}

export function RecentlyWatchedSection({ onSelectTitle }: Props) {
  const [items, setItems] = useState<
    Array<{ id: string; title: string; posterPath: string | null }>
  >([]);

  useEffect(() => {
    (async () => {
      const history = await getRecentlyWatched(10);
      const titles = await getTitlesByIds(history.map(h => h.titleId));
      setItems(titles);
    })();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Recently Watched</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>
          Titles you mark as watched will show up here.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items.map(item => (
            <TitleCard
              key={item.id}
              title={item.title}
              posterPath={item.posterPath ?? undefined}
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
