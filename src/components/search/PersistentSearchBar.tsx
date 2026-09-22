import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { searchIndex } from '../../search/fuseIndex';
import { SearchResultsOverlay } from './SearchResultsOverlay';

interface Props {
  onSelectTitle: (titleId: string) => void;
}

export function PersistentSearchBar({ onSelectTitle }: Props) {
  const [query, setQuery] = useState('');

  const results = searchIndex(query);

  return (
    <View style={styles.container}>
      {query.trim() ? (
        <SearchResultsOverlay
          query={query}
          results={results}
          onSelectTitle={id => {
            setQuery('');
            onSelectTitle(id);
          }}
        />
      ) : null}
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles, cast, genres..."
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: 'white',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
