import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { pullToLeave } from './pullToLeave';
import { EmptyState, SectionLabel } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';

interface Props {
  history: string[];
  onPick: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onPullDown?: () => void;
}

export function SearchHistory({
  history,
  onPick,
  onRemove,
  onClear,
  onPullDown,
}: Props) {
  const c = useColors();
  if (history.length === 0) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...pullToLeave(onPullDown)}
      >
        <EmptyState message="Search your library and everything on TMDB." />
      </ScrollView>
    );
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...pullToLeave(onPullDown)}
    >
      <View style={styles.header}>
        <SectionLabel style={styles.label}>Recent</SectionLabel>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={[type.meta, { color: c.accent }]}>Clear</Text>
        </Pressable>
      </View>
      {history.map(q => (
        <Pressable
          key={q}
          onPress={() => onPick(q)}
          style={({ pressed }) => [
            styles.row,
            pressed && { backgroundColor: c.chip },
          ]}
        >
          <Text style={[styles.icon, { color: c.tertiary }]}>↺</Text>
          <Text
            style={[type.body, styles.query, { color: c.text }]}
            numberOfLines={1}
          >
            {q}
          </Text>
          <Pressable
            onPress={() => onRemove(q)}
            hitSlop={10}
            accessibilityLabel={`Remove ${q}`}
          >
            <Text style={[styles.icon, { color: c.tertiary }]}>✕</Text>
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: space.l,
  },
  label: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  query: { flex: 1 },
  icon: { fontSize: 17 },
});
