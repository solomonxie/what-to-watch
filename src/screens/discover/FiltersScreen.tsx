import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DEFAULT_FILTERS, useFilterStore } from '../../state/filterStore';
import { getAllCachedTitles } from '../../db/repositories/titlesRepo';
import { Chip, ChipRow, SectionLabel, Segmented } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import type { DiscoverStackParamList } from '../../navigation/types';
import type { SortKey } from '../../types/domain';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Filters'>;

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'Title' },
];

const MAX_YEAR = DEFAULT_FILTERS.yearRange[1];
const RATINGS = [
  { label: 'Any', min: 0 },
  { label: '6+', min: 60 },
  { label: '7+', min: 70 },
  { label: '8+', min: 80 },
];
const YEARS: { label: string; range: [number, number] }[] = [
  { label: 'Any', range: DEFAULT_FILTERS.yearRange },
  { label: '2020s', range: [2020, MAX_YEAR] },
  { label: '2010s', range: [2010, 2019] },
  { label: '2000s', range: [2000, 2009] },
  { label: 'Older', range: [1900, 1999] },
];

interface Facets {
  genres: string[];
  languages: string[];
  regions: string[];
}

async function loadFacets(): Promise<Facets> {
  const titles = await getAllCachedTitles();
  const collect = (
    pick: (t: (typeof titles)[number]) => Array<string | null | undefined>,
  ) =>
    Array.from(
      new Set(titles.flatMap(pick).filter((v): v is string => !!v)),
    ).sort();
  return {
    genres: collect(t => t.genres),
    languages: collect(t => [t.originalLanguage]),
    regions: collect(t => t.originCountries ?? []),
  };
}

export function FiltersScreen({ navigation }: Props) {
  const c = useColors();
  const { filters, sort, setFilters, setSort, resetFilters } = useFilterStore();
  const [facets, setFacets] = useState<Facets>({
    genres: [],
    languages: [],
    regions: [],
  });

  useEffect(() => {
    loadFacets().then(setFacets);
  }, []);

  const toggle = (key: 'genres' | 'languages' | 'regions', value: string) => {
    const list = filters[key];
    setFilters({
      [key]: list.includes(value)
        ? list.filter(v => v !== value)
        : [...list, value],
    });
  };

  const facetGroup = (
    label: string,
    key: 'genres' | 'languages' | 'regions',
    format: (v: string) => string = v => v,
  ) => {
    const values = Array.from(new Set([...facets[key], ...filters[key]]));
    if (values.length === 0) return null;
    return (
      <>
        <SectionLabel>{label}</SectionLabel>
        <ChipRow>
          {values.map(v => (
            <Chip
              key={v}
              label={format(v)}
              selected={filters[key].includes(v)}
              onPress={() => toggle(key, v)}
            />
          ))}
        </ChipRow>
      </>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={resetFilters} hitSlop={8}>
          <Text style={[styles.action, { color: c.accent }]}>Clear</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Filters</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={[styles.action, styles.done, { color: c.accent }]}>
            Done
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>Sort</SectionLabel>
        <Segmented
          options={SORTS}
          value={sort.key}
          onChange={key =>
            setSort({ key, direction: key === 'title' ? 'asc' : 'desc' })
          }
        />

        <SectionLabel>Minimum rating</SectionLabel>
        <ChipRow>
          {RATINGS.map(r => (
            <Chip
              key={r.label}
              label={r.label}
              selected={filters.ratingRange[0] === r.min}
              onPress={() => setFilters({ ratingRange: [r.min, 100] })}
            />
          ))}
        </ChipRow>

        <SectionLabel>Year</SectionLabel>
        <ChipRow>
          {YEARS.map(y => (
            <Chip
              key={y.label}
              label={y.label}
              selected={
                filters.yearRange[0] === y.range[0] &&
                filters.yearRange[1] === y.range[1]
              }
              onPress={() => setFilters({ yearRange: y.range })}
            />
          ))}
        </ChipRow>

        {facetGroup('Genre', 'genres')}
        {facetGroup('Language', 'languages', v => v.toUpperCase())}
        {facetGroup('Country', 'regions')}

        <SectionLabel>Cast</SectionLabel>
        <TextInput
          style={[styles.input, { backgroundColor: c.chip, color: c.text }]}
          placeholder="Actor name"
          placeholderTextColor={c.secondary}
          autoCorrect={false}
          value={filters.cast.join(', ')}
          onChangeText={text =>
            setFilters({ cast: text ? text.split(',') : [] })
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    paddingVertical: space.l,
  },
  title: { fontSize: 17, fontWeight: '600' },
  action: { fontSize: 17 },
  done: { fontWeight: '600' },
  content: { paddingBottom: 48 },
  input: {
    marginHorizontal: space.l,
    borderRadius: 10,
    paddingHorizontal: space.m,
    paddingVertical: 10,
    fontSize: 17,
  },
});
