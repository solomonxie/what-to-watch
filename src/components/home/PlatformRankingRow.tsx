import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TitleCard } from '../title/TitleCard';

interface RankedTitle {
  id: string;
  title: string;
  posterPath: string | null;
  rank: number;
}

interface Props {
  label: string;
  items: RankedTitle[];
  onSelectTitle: (titleId: string) => void;
}

export function PlatformRankingRow({ label, items, onSelectTitle }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map(item => (
          <TitleCard
            key={item.id}
            title={item.title}
            posterPath={item.posterPath ?? undefined}
            ratingLabel={`#${item.rank}`}
            onPress={() => onSelectTitle(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#444' },
});
