import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { SearchableTitle } from '../../search/fuseIndex';
import { TitleCard } from '../title/TitleCard';

interface Props {
  query: string;
  results: SearchableTitle[];
  onSelectTitle: (titleId: string) => void;
}

export function SearchResultsOverlay({ query, results, onSelectTitle }: Props) {
  if (!query.trim()) return null;

  return (
    <View style={styles.overlay}>
      {results.length === 0 ? (
        <Text style={styles.empty}>No results for "{query}"</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TitleCard
              title={item.title}
              posterPath={item.posterPath ?? undefined}
              onPress={() => onSelectTitle(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  empty: { color: '#888', fontSize: 14, marginTop: 24, textAlign: 'center' },
});
