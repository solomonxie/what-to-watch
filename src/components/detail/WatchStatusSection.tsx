import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getWatchEntry,
  recordWatch,
} from '../../db/repositories/watchHistoryRepo';
import type { WatchStatus } from '../../types/domain';

type Entry = Awaited<ReturnType<typeof getWatchEntry>>;

const SECONDARY: { status: WatchStatus; label: string }[] = [
  { status: 'watching', label: 'Watching' },
  { status: 'dropped', label: 'Dropped' },
];

function describe(entry: NonNullable<Entry>): string {
  const date = new Date(entry.watchedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (entry.status === 'watching') return `Watching · since ${date}`;
  if (entry.status === 'dropped') return `Dropped · ${date}`;
  return `Watched ${entry.rewatchCount}× · last ${date}`;
}

export function WatchStatusSection({ titleId }: { titleId: string }) {
  const [entry, setEntry] = useState<Entry | undefined>(undefined);

  const load = useCallback(
    () => getWatchEntry(titleId).then(setEntry),
    [titleId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (status: WatchStatus) => {
    await recordWatch(titleId, status);
    await load();
  };

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Pressable style={styles.primary} onPress={() => mark('completed')}>
          <Text style={styles.primaryText}>Mark watched</Text>
        </Pressable>
        {SECONDARY.map(({ status, label }) => (
          <Pressable
            key={status}
            style={[
              styles.secondary,
              entry?.status === status && styles.secondaryActive,
            ]}
            onPress={() => mark(status)}
          >
            <Text
              style={
                entry?.status === status
                  ? styles.activeText
                  : styles.secondaryText
              }
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {entry ? <Text style={styles.meta}>{describe(entry)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryText: { color: 'white', fontWeight: '600' },
  secondary: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  secondaryActive: { backgroundColor: '#eee' },
  secondaryText: { color: '#007aff', fontWeight: '500' },
  activeText: { color: '#333', fontWeight: '600' },
  meta: { color: '#666', fontSize: 13, marginTop: 8 },
});
