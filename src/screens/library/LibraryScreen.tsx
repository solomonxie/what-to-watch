import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
} from '../../ui/components';
import { joinMeta, mediaLabel, year } from '../../ui/format';
import { space, useColors } from '../../ui/theme';
import type { LibraryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;
type Tab = 'watched' | 'watching' | 'rated';

const TABS: { value: Tab; label: string }[] = [
  { value: 'watched', label: 'Watched' },
  { value: 'watching', label: 'Watching' },
  { value: 'rated', label: 'Rated' },
];

const EMPTY: Record<Tab, string> = {
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
          .filter(
            h => h.status === (tab === 'watched' ? 'completed' : 'watching'),
          )
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
  const [tab, setTab] = useState<Tab>('watched');
  const [items, setItems] = useState<GridItem[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadItems(tab).then(setItems);
    }, [tab]),
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
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
  segment: { paddingTop: space.s, paddingBottom: space.l },
});
