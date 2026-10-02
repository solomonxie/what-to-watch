import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getNotesForTitle,
  onMarksChanged,
} from '../../db/repositories/notesRepo';
import { SectionLabel } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { StarRating } from './StarRating';
import type { RootStackParamList } from '../../navigation/types';

type WatchMark = Awaited<ReturnType<typeof getNotesForTitle>>[number];

export function formatMarkDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Every rating with its date and review, newest first; tap to edit. */
export function WatchMarks({ titleId }: { titleId: string }) {
  const c = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [marks, setMarks] = useState<WatchMark[]>([]);

  const reload = useCallback(
    () => getNotesForTitle(titleId).then(setMarks),
    [titleId],
  );
  useEffect(() => {
    reload();
    return onMarksChanged(id => id === titleId && reload());
  }, [reload, titleId]);

  const open = (markId?: number) =>
    navigation.navigate('WatchMark', { titleId, markId });

  return (
    <>
      <View style={styles.header}>
        <SectionLabel>Watch marks</SectionLabel>
        <Pressable
          onPress={() => open()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Add watch mark"
        >
          <Text style={[styles.add, { color: c.accent }]}>+ Add</Text>
        </Pressable>
      </View>
      {marks.map(m => (
        <Pressable
          key={m.id}
          onPress={() => open(m.id)}
          style={({ pressed }) => [
            styles.mark,
            pressed && { backgroundColor: c.chip },
          ]}
        >
          <View style={styles.line}>
            {m.rating ? (
              <StarRating value={m.rating} size={14} showValue={false} />
            ) : null}
            <Text style={[styles.date, { color: c.secondary }]}>
              {formatMarkDate(m.markedAt)}
            </Text>
          </View>
          {m.body ? (
            <Text style={[styles.body, { color: c.text }]}>{m.body}</Text>
          ) : null}
        </Pressable>
      ))}
      {marks.length === 0 ? (
        <Text style={[styles.empty, { color: c.secondary }]}>
          No marks yet. Rate it above to add one.
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  add: {
    fontSize: 15,
    fontWeight: '600',
    paddingRight: space.l,
    marginBottom: space.s,
  },
  mark: { paddingHorizontal: space.l, paddingVertical: space.s, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  date: { fontSize: 13, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  empty: { fontSize: 15, paddingHorizontal: space.l },
});
