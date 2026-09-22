import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFilterStore } from '../../state/filterStore';
import type { SortKey } from '../../types/domain';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'year', label: 'Year' },
  { key: 'title', label: 'Title' },
];

export function FiltersEntryPoint() {
  const [visible, setVisible] = useState(false);
  const { filters, sort, setFilters, setSort } = useFilterStore();

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerText}>Filters &amp; Sort</Text>
      </Pressable>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Filters</Text>

            <Text style={styles.label}>Minimum rating (0-100)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(filters.ratingRange[0])}
              onChangeText={text =>
                setFilters({ ratingRange: [Number(text) || 0, filters.ratingRange[1]] })
              }
            />

            <Text style={styles.label}>Sort by</Text>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.sortChip, sort.key === opt.key && styles.sortChipActive]}
                  onPress={() => setSort({ ...sort, key: opt.key })}
                >
                  <Text>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* TODO: genre, year range, region, language, and cast filter controls */}
            <Text style={styles.todo}>
              Genre, year, region, language, and cast filters are coming soon.
            </Text>

            <Pressable style={styles.close} onPress={() => setVisible(false)}>
              <Text style={styles.closeText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  triggerText: { fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#eee', borderRadius: 16 },
  sortChipActive: { backgroundColor: '#333' },
  todo: { color: '#999', fontSize: 12, marginTop: 16 },
  close: { marginTop: 20, alignSelf: 'center' },
  closeText: { color: '#007aff', fontWeight: '600' },
});
