import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAllWatchHistory } from '../../db/repositories/watchHistoryRepo';
import { getAllUserRatings } from '../../db/repositories/ratingsRepo';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import {
  EmptyState,
  PosterGrid,
  Segmented,
  type GridItem,
  FLOATING_CLEARANCE,
} from '../../ui/components';
import { joinMeta, mediaLabel, year } from '../../ui/format';
import { space, useColors } from '../../ui/theme';
import type { LibraryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;
type Tab = 'toWatch' | 'watching' | 'watched' | 'rated';

const TABS: { value: Tab; label: string }[] = [
  { value: 'toWatch', label: 'To watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'rated', label: 'Rated' },
];

const STATUS_FOR_TAB: Record<Exclude<Tab, 'rated'>, string> = {
  toWatch: 'toWatch',
  watching: 'watching',
  watched: 'completed',
};

const EMPTY: Record<Tab, string> = {
  toWatch: 'Save titles to watch later from any title page.',
  watched: 'Titles you mark watched show up here.',
  watching: 'Nothing in progress.',
  rated: 'Rate a title to see it here.',
};

async function loadItems(tab: Tab): Promise<GridItem[]> {
  const entries =
    tab === 'rated'
      ? (await getAllUserRatings())
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(r => ({ titleId: r.titleId, badge: `★ ${r.rating}` }))
      : (await getAllWatchHistory())
          .filter(h => h.status === STATUS_FOR_TAB[tab])
          .sort((a, b) => b.watchedAt - a.watchedAt)
          .map(h => ({
            titleId: h.titleId,
            badge:
              tab === 'watched' && h.rewatchCount > 1
                ? `${h.rewatchCount}×`
                : undefined,
          }));
  const titles = new Map(
    (await getTitlesByIds(entries.map(e => e.titleId))).map(t => [t.id, t]),
  );
  return entries.flatMap(e => {
    const t = titles.get(e.titleId);
    if (!t) return [];
    return [
      {
        id: t.id,
        title: t.title,
        posterPath: t.posterPath,
        badge: e.badge,
        badgeCorner: 'right' as const,
        meta: joinMeta([year(t.releaseDate), mediaLabel(t.mediaType)]),
      },
    ];
  });
}

export function LibraryScreen({ navigation }: Props) {
  const c = useColors();
  const [tab, setTab] = useState<Tab>('toWatch');
  const [items, setItems] = useState<GridItem[] | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Import')} hitSlop={8}>
          <Text style={[styles.headerButton, { color: c.accent }]}>Import</Text>
        </Pressable>
      ),
    });
  }, [navigation, c.accent]);

  useFocusEffect(
    useCallback(() => {
      loadItems(tab).then(setItems);
    }, [tab]),
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: FLOATING_CLEARANCE }}
    >
      <View style={styles.segment}>
        <Segmented
          options={TABS}
          value={tab}
          onChange={next => {
            setItems(null);
            setTab(next);
          }}
        />
      </View>
      {items === null ? (
        <EmptyState loading />
      ) : items.length === 0 ? (
        <EmptyState message={EMPTY[tab]} />
      ) : (
        <PosterGrid
          items={items}
          onPress={titleId => navigation.navigate('Title', { titleId })}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17 },
  segment: { paddingTop: space.s, paddingBottom: space.l },
});
