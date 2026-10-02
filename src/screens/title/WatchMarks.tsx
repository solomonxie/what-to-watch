import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getMarksForTitle,
  onMarksChanged,
} from '../../db/repositories/marksRepo';
import { isTick, type Mark } from '../../marks/derive';
import { markLine } from '../../marks/labels';
import { SectionLabel } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { StarRating } from './StarRating';
import type { RootStackParamList } from '../../navigation/types';

export { formatMarkDate } from '../../marks/labels';

/**
 * Every mark on the title, its seasons and episodes, newest first; tap to
 * edit. Plain episode ticks show as checkmarks in Seasons instead.
 */
export function WatchMarks({ titleId }: { titleId: string }) {
  const c = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [marks, setMarks] = useState<Mark[]>([]);

  const reload = useCallback(
    () =>
      getMarksForTitle(titleId).then(all =>
        setMarks(all.filter(m => !isTick(m))),
      ),
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
      {marks.map((m, i) => (
        <Pressable
          key={m.id}
          onPress={() => open(m.id!)}
          style={({ pressed }) => [
            styles.mark,
            i > 0 && [styles.divided, { borderTopColor: c.separator }],
            pressed && { backgroundColor: c.chip },
          ]}
        >
          <View style={styles.line}>
            {m.rating ? (
              <StarRating value={m.rating} size={14} showValue={false} />
            ) : null}
            <Text style={[styles.meta, { color: c.secondary }]}>
              {markLine(m)}
            </Text>
          </View>
          {m.review ? (
            <Text style={[styles.review, { color: c.text }]}>{m.review}</Text>
          ) : null}
        </Pressable>
      ))}
      {marks.length === 0 ? (
        <Text style={[styles.empty, { color: c.secondary }]}>
          No marks yet.
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
  mark: { marginHorizontal: space.l, paddingVertical: space.m, gap: 4 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  meta: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  review: { fontSize: 16, lineHeight: 22 },
  empty: { fontSize: 15, paddingHorizontal: space.l },
});
