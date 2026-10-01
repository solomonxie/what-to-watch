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
import {
  countryName,
  languageName,
  unifiedGenres,
} from '../../config/taxonomy';
import { Chip, Segmented } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import type { DiscoverStackParamList } from '../../navigation/types';
import type { AgeGroup, SortKey, TitleKind } from '../../types/domain';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Filters'>;
type FacetKey = 'genres' | 'languages' | 'regions';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'A–Z' },
];

const KINDS: { value: TitleKind; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'series', label: 'Series' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'docuseries', label: 'Docuseries' },
  { value: 'unscripted', label: 'Reality & talk' },
];

const AGES: { value: AgeGroup; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'kids', label: 'Kids 0–6' },
  { value: 'children', label: '7–12' },
  { value: 'teens', label: 'Teens 13–16' },
  { value: 'adults', label: 'Adults 17+' },
];

const MAX_YEAR = DEFAULT_FILTERS.yearRange[1];
const RATINGS = [
  { value: '0', label: 'Any' },
  { value: '60', label: '★ 6+' },
  { value: '70', label: '★ 7+' },
  { value: '80', label: '★ 8+' },
];

// The last three years exactly, then decades.
const THIS_YEAR = new Date().getFullYear();
const RECENT = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];
const YEAR_OPTIONS: {
  value: string;
  label: string;
  range: [number, number];
}[] = [
  { value: 'any', label: 'Any', range: DEFAULT_FILTERS.yearRange },
  ...RECENT.map(y => ({
    value: String(y),
    label: String(y),
    range: [y, y] as [number, number],
  })),
  { value: '2020s', label: '2020s', range: [2020, MAX_YEAR] },
  { value: '2010s', label: '2010s', range: [2010, 2019] },
  { value: '2000s', label: '2000s', range: [2000, 2009] },
  { value: 'older', label: 'Older', range: [1900, 1999] },
];

type Facets = Record<FacetKey, string[]>;

async function loadFacets(): Promise<Facets> {
  const titles = await getAllCachedTitles();
  const collect = (
    pick: (t: (typeof titles)[number]) => Array<string | null | undefined>,
  ) =>
    Array.from(new Set(titles.flatMap(pick).filter((v): v is string => !!v)));
  return {
    genres: collect(t => t.genres.flatMap(unifiedGenres)),
    languages: collect(t => [t.originalLanguage]),
    regions: collect(t => t.originCountries ?? []),
  };
}

function Section({
  title,
  count,
  onClear,
  children,
}: {
  title: string;
  count?: number;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          style={[type.section, styles.sectionTitle, { color: c.secondary }]}
        >
          {title.toUpperCase()}
        </Text>
        {count ? (
          <Text style={[type.meta, { color: c.secondary }]}>{count}</Text>
        ) : null}
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={10}>
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

/** One line of chips that scrolls sideways; never wraps. */
function ChipLine<T extends string>({
  options,
  isSelected,
  onPress,
}: {
  options: { value: T; label: string }[];
  isSelected: (v: T) => boolean;
  onPress: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipLine}
      keyboardShouldPersistTaps="handled"
    >
      {options.map(o => (
        <Chip
          key={o.value}
          label={o.label}
          selected={isSelected(o.value)}
          onPress={() => onPress(o.value)}
        />
      ))}
    </ScrollView>
  );
}

function MultiSection<T extends string>({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  if (options.length === 0) return null;
  // Selected first, so a choice never scrolls out of sight.
  const ordered = [
    ...options.filter(o => selected.includes(o.value)),
    ...options.filter(o => !selected.includes(o.value)),
  ];
  return (
    <Section
      title={title}
      count={selected.length > 1 ? selected.length : undefined}
      onClear={selected.length ? () => onChange([]) : undefined}
    >
      <ChipLine
        options={ordered}
        isSelected={v => selected.includes(v)}
        onPress={v =>
          onChange(
            selected.includes(v)
              ? selected.filter(x => x !== v)
              : [...selected, v],
          )
        }
      />
    </Section>
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

  const facetOptions = (key: FacetKey, label: (v: string) => string) =>
    Array.from(new Set([...filters[key], ...facets[key]]))
      .map(v => ({ value: v, label: label(v) }))
      .sort((x, y) => x.label.localeCompare(y.label));

  const yearKey =
    YEAR_OPTIONS.find(
      o =>
        o.range[0] === filters.yearRange[0] &&
        o.range[1] === filters.yearRange[1],
    )?.value ?? 'any';
  const castText = filters.cast.join(', ');

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
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
        <Section title="Sort by">
          <Segmented
            options={SORTS}
            value={sort.key}
            onChange={key =>
              setSort({ key, direction: key === 'title' ? 'asc' : 'desc' })
            }
          />
        </Section>

        <View style={[styles.divider, { backgroundColor: c.separator }]} />

        <MultiSection
          title="Type"
          options={KINDS}
          selected={filters.kinds}
          onChange={kinds => setFilters({ kinds })}
        />

        <Section
          title="Released"
          onClear={
            yearKey !== 'any'
              ? () => setFilters({ yearRange: DEFAULT_FILTERS.yearRange })
              : undefined
          }
        >
          <ChipLine
            options={YEAR_OPTIONS}
            isSelected={v => v === yearKey}
            onPress={v =>
              setFilters({
                yearRange: YEAR_OPTIONS.find(o => o.value === v)!.range,
              })
            }
          />
        </Section>

        <Section title="Rating">
          <ChipLine
            options={RATINGS}
            isSelected={v => Number(v) === filters.ratingRange[0]}
            onPress={v => setFilters({ ratingRange: [Number(v), 100] })}
          />
        </Section>

        <MultiSection
          title="Age"
          options={AGES}
          selected={filters.ages}
          onChange={ages => setFilters({ ages })}
        />

        <MultiSection
          title="Genre"
          options={facetOptions('genres', v => v)}
          selected={filters.genres}
          onChange={genres => setFilters({ genres })}
        />
        <MultiSection
          title="Language"
          options={facetOptions('languages', languageName)}
          selected={filters.languages}
          onChange={languages => setFilters({ languages })}
        />
        <MultiSection
          title="Country"
          options={facetOptions('regions', countryName)}
          selected={filters.regions}
          onChange={regions => setFilters({ regions })}
        />

        <Section
          title="Cast"
          onClear={castText ? () => setFilters({ cast: [] }) : undefined}
        >
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
          </View>
        </Section>
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
  section: { marginBottom: space.xl, gap: space.s },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
  },
  sectionTitle: { flex: 1 },
  clear: { fontWeight: '600' },
  chipLine: { paddingHorizontal: space.l, gap: space.s },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.l,
    marginBottom: space.xl,
  },
  field: {
    marginHorizontal: space.l,
    borderRadius: 10,
    paddingHorizontal: space.m,
  },
  input: { paddingVertical: 10, fontSize: 17 },
});
