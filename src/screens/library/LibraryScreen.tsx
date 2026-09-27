import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAllWatchHistory } from '../../db/repositories/watchHistoryRepo';
import { getAllUserRatings } from '../../db/repositories/ratingsRepo';
import { getLatestEpisodes } from '../../db/repositories/episodeWatchesRepo';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import {
  EmptyState,
  PosterTile,
  SectionLabel,
  type GridItem,
  FLOATING_CLEARANCE,
} from '../../ui/components';
import { joinMeta, mediaLabel, year } from '../../ui/format';
import { space, type, useColors } from '../../ui/theme';
import type { LibraryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;

export interface Section {
  title: string;
  items: GridItem[];
}

interface Entry {
  titleId: string;
  badge?: string;
  meta?: string;
}

const TOP = 8;
const SO_SO = 5;

export async function loadSections(): Promise<Section[]> {
  const [history, ratings, latest] = await Promise.all([
    getAllWatchHistory(),
    getAllUserRatings(),
    getLatestEpisodes(),
  ]);
  const rating = new Map(ratings.map(r => [r.titleId, r]));
  const byActivity = [...history].sort((a, b) => b.watchedAt - a.watchedAt);
  // Only shows are ever in progress; a movie marked watching counts as seen.
  const isMovie = (id: string) => id.startsWith('movie:');
  const watching = byActivity.filter(
    h => h.status === 'watching' && !isMovie(h.titleId),
  );
  const inProgress = new Set(watching.map(h => h.titleId));

  const continueWatching: Entry[] = watching.map(h => {
    const ep = latest.get(h.titleId);
    return {
      titleId: h.titleId,
      meta: ep ? `S${ep.season} · E${ep.episode}` : undefined,
    };
  });
  const watchNext: Entry[] = byActivity
    .filter(h => h.status === 'toWatch' && !rating.has(h.titleId))
    .map(h => ({ titleId: h.titleId }));

  const rated = ratings
    .filter(r => !inProgress.has(r.titleId))
    .sort((a, b) => b.rating - a.rating || b.updatedAt - a.updatedAt);
  const bucket = (min: number, max: number): Entry[] =>
    rated
      .filter(r => r.rating >= min && r.rating < max)
      .map(r => ({ titleId: r.titleId, badge: `★ ${r.rating}` }));

  const unrated: Entry[] = byActivity
    .filter(
      h =>
        h.status !== 'toWatch' &&
        !inProgress.has(h.titleId) &&
        !rating.has(h.titleId),
    )
    .map(h => ({ titleId: h.titleId }));

  const groups: [string, Entry[]][] = [
    ['Continue watching', continueWatching],
    ['My next watch', watchNext],
    ['My top rated', bucket(TOP, Infinity)],
    ['I feel so-so', bucket(SO_SO, TOP)],
    ['Waste of time', bucket(-Infinity, SO_SO)],
    ['To be rated', unrated],
  ];

  const titles = new Map(
    (
      await getTitlesByIds(
        groups.flatMap(([, entries]) => entries).map(e => e.titleId),
      )
    ).map(t => [t.id, t]),
  );
  return groups
    .map(([title, entries]) => ({
      title,
      items: entries.flatMap(e => {
        const t = titles.get(e.titleId);
        if (!t) return [];
        return [
          {
            id: t.id,
            title: t.title,
            posterPath: t.posterPath,
            badge: e.badge,
            badgeCorner: 'right' as const,
            meta:
              e.meta ??
              joinMeta([year(t.releaseDate), mediaLabel(t.mediaType)]),
          },
        ];
      }),
    }))
    .filter(s => s.items.length > 0);
}

export function LibraryScreen({ navigation }: Props) {
  const c = useColors();
  const [sections, setSections] = useState<Section[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSections().then(setSections);
    }, []),
  );

  const open = (titleId: string) => navigation.navigate('Title', { titleId });

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: FLOATING_CLEARANCE }}
    >
      {sections === null ? (
        <EmptyState loading />
      ) : sections.length === 0 ? (
        <EmptyState message="Mark titles Interested, track episodes, or rate what you've watched." />
      ) : (
        sections.map(section => (
          <View key={section.title}>
            <View style={styles.header}>
              <SectionLabel>{section.title}</SectionLabel>
              <Pressable
                onPress={() =>
                  navigation.navigate('LibrarySection', {
                    title: section.title,
                  })
                }
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`See all ${section.items.length} in ${section.title}`}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={[type.meta, styles.count, { color: c.accent }]}>
                  {`${section.items.length} ›`}
                </Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={section.items}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
              initialNumToRender={6}
              renderItem={({ item }) => (
                <PosterTile item={item} onPress={() => open(item.id)} />
              )}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  count: {
    paddingRight: space.l,
    marginBottom: space.s,
    fontWeight: '600',
  },
  pressed: { opacity: 0.5 },
  row: { paddingHorizontal: space.l, gap: space.m },
});
