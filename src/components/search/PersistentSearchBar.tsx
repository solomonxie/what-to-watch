import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  query: string;
  onChangeQuery: (query: string) => void;
  bottomInset: number;
}

export function PersistentSearchBar({
  query,
  onChangeQuery,
  bottomInset,
}: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: 10 + bottomInset }]}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search titles, cast, genres"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {query ? (
        <Pressable onPress={() => onChangeQuery('')} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  cancel: { color: '#007aff', fontSize: 15 },
});
