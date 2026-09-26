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
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  countActiveFilters,
  useFilterStore,
} from '../../state/filterStore';
import { getAllCachedTitles } from '../../db/repositories/titlesRepo';
import { countryName, languageName } from '../../config/taxonomy';
import { Chip, Segmented } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import type { DiscoverStackParamList } from '../../navigation/types';
import type { SortKey } from '../../types/domain';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Filters'>;
type FacetKey = 'genres' | 'languages' | 'regions';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'A–Z' },
];

const MAX_YEAR = DEFAULT_FILTERS.yearRange[1];
const RATINGS = [
  { value: '0', label: 'Any' },
  { value: '60', label: '★ 6+' },
  { value: '70', label: '★ 7+' },
  { value: '80', label: '★ 8+' },
];
const YEARS: Record<string, [number, number]> = {
  any: DEFAULT_FILTERS.yearRange,
  '2020s': [2020, MAX_YEAR],
  '2010s': [2010, 2019],
  '2000s': [2000, 2009],
  older: [1900, 1999],
};
const YEAR_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '2020s', label: '2020s' },
  { value: '2010s', label: '2010s' },
  { value: '2000s', label: '2000s' },
  { value: 'older', label: 'Older' },
];
const COLLAPSED = 8;

type Facets = Record<FacetKey, string[]>;

async function loadFacets(): Promise<Facets> {
  const titles = await getAllCachedTitles();
  const collect = (
    pick: (t: (typeof titles)[number]) => Array<string | null | undefined>,
  ) =>
    Array.from(new Set(titles.flatMap(pick).filter((v): v is string => !!v)));
  return {
    genres: collect(t => t.genres),
    languages: collect(t => [t.originalLanguage]),
    regions: collect(t => t.originCountries ?? []),
  };
}

function Card({
  title,
  status,
  onClear,
  children,
}: {
  title: string;
  status?: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
        {status ? (
          <Text style={[type.meta, { color: c.secondary }]}>{status}</Text>
        ) : null}
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={[type.meta, styles.clear, { color: c.accent }]}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FacetCard({
  title,
  values,
  selected,
  label,
  onToggle,
  onClear,
}: {
  title: string;
  values: string[];
  selected: string[];
  label: (v: string) => string;
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const all = Array.from(new Set([...selected, ...values]));
  if (all.length === 0) return null;
  const sorted = [
    ...selected,
    ...all
      .filter(v => !selected.includes(v))
      .sort((a, b) => label(a).localeCompare(label(b))),
  ];
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED);
  return (
    <Card
      title={title}
      status={selected.length ? `${selected.length} selected` : undefined}
      onClear={selected.length ? onClear : undefined}
    >
      <View style={styles.chips}>
        {shown.map(v => (
          <Chip
            key={v}
            label={label(v)}
            selected={selected.includes(v)}
            onPress={() => onToggle(v)}
          />
        ))}
      </View>
      {sorted.length > COLLAPSED ? (
        <Pressable
          onPress={() => setExpanded(e => !e)}
          hitSlop={8}
          style={styles.more}
        >
          <Text style={[type.meta, styles.clear, { color: c.accent }]}>
            {expanded ? 'Show less' : `Show all ${sorted.length}`}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
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

  const dirty =
    countActiveFilters(filters) > 0 || sort.key !== DEFAULT_SORT.key;

  const toggle = (key: FacetKey, value: string) => {
    const list = filters[key];
    setFilters({
      [key]: list.includes(value)
        ? list.filter(v => v !== value)
        : [...list, value],
    });
  };

  const facet = (
    title: string,
    key: FacetKey,
    label: (v: string) => string,
  ) => (
    <FacetCard
      title={title}
      values={facets[key]}
      selected={filters[key]}
      label={label}
      onToggle={v => toggle(key, v)}
      onClear={() => setFilters({ [key]: [] })}
    />
  );

  const yearKey =
    Object.keys(YEARS).find(
      k =>
        YEARS[k][0] === filters.yearRange[0] &&
        YEARS[k][1] === filters.yearRange[1],
    ) ?? null;
  const castText = filters.cast.join(', ');

  return (
    <View style={[styles.root, { backgroundColor: c.groupedBackground }]}>
      <View style={styles.header}>
        <Pressable onPress={resetFilters} disabled={!dirty} hitSlop={8}>
          <Text
            style={[styles.action, { color: dirty ? c.accent : c.tertiary }]}
          >
            Reset
          </Text>
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
        keyboardDismissMode="on-drag"
      >
        <Card title="Sort by">
          <Segmented
            style={styles.flush}
            options={SORTS}
            value={sort.key}
            onChange={key =>
              setSort({ key, direction: key === 'title' ? 'asc' : 'desc' })
            }
          />
        </Card>

        <Card title="Rating">
          <Segmented
            style={styles.flush}
            options={RATINGS}
            value={String(filters.ratingRange[0])}
            onChange={min => setFilters({ ratingRange: [Number(min), 100] })}
          />
        </Card>

        <Card title="Released">
          <Segmented
            style={styles.flush}
            options={YEAR_OPTIONS}
            value={yearKey}
            onChange={k => setFilters({ yearRange: YEARS[k] })}
          />
        </Card>

        {facet('Genre', 'genres', v => v)}
        {facet('Language', 'languages', languageName)}
        {facet('Country', 'regions', countryName)}

        <Card title="Cast">
          <View style={[styles.field, { backgroundColor: c.chip }]}>
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder="Actor names, comma-separated"
              placeholderTextColor={c.secondary}
              autoCorrect={false}
              returnKeyType="done"
              value={castText}
              onChangeText={text =>
                setFilters({ cast: text ? text.split(',') : [] })
              }
            />
            {castText ? (
              <Pressable
                onPress={() => setFilters({ cast: [] })}
                hitSlop={8}
                accessibilityLabel="Clear cast"
              >
                <Text style={[styles.clearGlyph, { color: c.tertiary }]}>
                  ✕
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Card>
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
  content: { paddingHorizontal: space.l, paddingBottom: 48, gap: space.m },
  card: { borderRadius: 14, padding: space.l, gap: space.m },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  clear: { fontWeight: '600' },
  flush: { marginHorizontal: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  more: { alignSelf: 'flex-start' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: space.m,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 17 },
  clearGlyph: { fontSize: 15, paddingLeft: space.s },
});
