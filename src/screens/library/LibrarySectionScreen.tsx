import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  BOTTOM_CLEARANCE,
  GRID_COLUMNS,
  PosterTile,
  type GridItem,
} from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { loadSections } from './LibraryScreen';
import { lastChanges, loadFacetItems } from './libraryFacets';
import { getAllUserRatings } from '../../db/repositories/ratingsRepo';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import type { LibraryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibrarySection'>;

type SortKey = 'changed' | 'mine' | 'score' | 'popularity' | 'year' | 'title';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'changed', label: 'Recently rated or marked' },
  { key: 'mine', label: 'My rating' },
  { key: 'score', label: 'TMDB rating' },
  { key: 'popularity', label: 'Popularity' },
  { key: 'year', label: 'Release year' },
  { key: 'title', label: 'Title A–Z' },
];

interface SortFacts {
  changed?: number;
  mine?: number;
  score?: number | null;
  popularity?: number | null;
  year: number;
  title: string;
}

async function sortFacts(ids: string[]): Promise<Map<string, SortFacts>> {
  const [titles, ratings, changes] = await Promise.all([
    getTitlesByIds(ids),
    getAllUserRatings(),
    lastChanges(),
  ]);
  const mine = new Map(ratings.map(r => [r.titleId, r.rating]));
  return new Map(
    titles.map(t => [
      t.id,
      {
        changed: changes.get(t.id),
        mine: mine.get(t.id),
        score: t.primaryRatingScore,
        popularity: t.popularity,
        year: Number(t.releaseDate?.slice(0, 4)) || 0,
        title: t.title,
      },
    ]),
  );
}

// Highest first, except titles A–Z; missing values sink to the end.
function compare(key: SortKey, a?: SortFacts, b?: SortFacts): number {
  if (key === 'title') return (a?.title ?? '').localeCompare(b?.title ?? '');
  return (b?.[key] ?? -1) - (a?.[key] ?? -1);
}

export function LibrarySectionScreen({ navigation, route }: Props) {
  const { title, facet } = route.params;
  const c = useColors();
  const [items, setItems] = useState<GridItem[] | null>(null);
  const [facts, setFacts] = useState<Map<string, SortFacts>>(new Map());
  const [sort, setSort] = useState<SortKey>('changed');

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      unstable_headerRightItems: () => [
        {
          type: 'menu',
          label: 'Sort',
          icon: { type: 'sfSymbol', name: 'arrow.up.arrow.down' },
          menu: {
            title: 'Sort by',
            items: SORTS.map(o => ({
              type: 'action' as const,
              label: o.label,
              state: o.key === sort ? ('on' as const) : ('off' as const),
              onPress: () => setSort(o.key),
            })),
          },
        },
      ],
    });
  }, [navigation, title, sort]);

  const sorted = useMemo(
    () =>
      items &&
      [...items].sort((a, b) =>
        compare(sort, facts.get(a.id), facts.get(b.id)),
      ),
    [items, facts, sort],
  );

  // Reloaded on focus: rating or marking a title here can move it elsewhere.
  useFocusEffect(
    useCallback(() => {
      const load = facet
        ? loadFacetItems(facet)
        : loadSections().then(
            sections => sections.find(s => s.title === title)?.items ?? [],
          );
      load.then(async list => {
        setFacts(await sortFacts(list.map(i => i.id)));
        setItems(list);
      });
    }, [title, facet]),
  );

  if (sorted === null) return <EmptyState loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      data={sorted}
      keyExtractor={item => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      initialNumToRender={18}
      windowSize={7}
      ListEmptyComponent={<EmptyState message="Nothing here any more." />}
      renderItem={({ item }) => (
        <PosterTile
          item={item}
          onPress={() => navigation.navigate('Title', { titleId: item.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.l,
    paddingTop: space.s,
    paddingBottom: BOTTOM_CLEARANCE,
  },
  row: { gap: space.m },
});
