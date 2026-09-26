import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  useFilterStore,
} from '../../state/filterStore';
import { getAllCachedTitles } from '../../db/repositories/titlesRepo';
import type { FilterState, SortKey } from '../../types/domain';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popularity', label: 'Popular' },
  { key: 'rating', label: 'Rating' },
  { key: 'year', label: 'Year' },
  { key: 'title', label: 'Title' },
];

interface Facets {
  genres: string[];
  regions: string[];
  languages: string[];
}

const EMPTY_FACETS: Facets = { genres: [], regions: [], languages: [] };

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
    regions: collect(t => t.originCountries ?? []),
    languages: collect(t => [t.originalLanguage]),
  };
}

export function FiltersEntryPoint() {
  const [visible, setVisible] = useState(false);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const { filters, sort, setFilters, setSort, resetFilters } = useFilterStore();
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (visible) loadFacets().then(setFacets);
  }, [visible]);

  return (
    <>
      <View style={styles.triggerRow}>
        <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
          <Text style={styles.triggerText}>
            Filters &amp; Sort{activeCount > 0 ? ` · ${activeCount}` : ''}
          </Text>
        </Pressable>
        {activeCount > 0 ? (
          <Pressable onPress={resetFilters} hitSlop={8}>
            <Text style={styles.link}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Filters &amp; Sort</Text>
              <Pressable onPress={resetFilters} hitSlop={8}>
                <Text style={styles.link}>Reset</Text>
              </Pressable>
              <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                <Text style={[styles.link, styles.done]}>Done</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>SORT</Text>
              <View style={styles.row}>
                <View style={styles.segmented}>
                  {SORT_OPTIONS.map(opt => (
                    <Chip
                      key={opt.key}
                      label={opt.label}
                      selected={sort.key === opt.key}
                      onPress={() => setSort({ ...sort, key: opt.key })}
                    />
                  ))}
                </View>
                {sort.key !== 'popularity' ? (
                  <Chip
                    label={
                      sort.direction === 'desc' ? '↓ High first' : '↑ Low first'
                    }
                    selected={false}
                    onPress={() =>
                      setSort({
                        ...sort,
                        direction: sort.direction === 'desc' ? 'asc' : 'desc',
                      })
                    }
                  />
                ) : null}
              </View>

              <Text style={styles.label}>RATING (0-100)</Text>
              <RangeInputs
                value={filters.ratingRange}
                fallback={DEFAULT_FILTERS.ratingRange}
                onChange={ratingRange => setFilters({ ratingRange })}
              />

              <Text style={styles.label}>WATCHED AT LEAST</Text>
              <View style={styles.row}>
                <Chip
                  label="−"
                  selected={false}
                  onPress={() =>
                    setFilters({
                      minWatchCount: Math.max(0, filters.minWatchCount - 1),
                    })
                  }
                />
                <Text style={styles.stepperValue}>{filters.minWatchCount}</Text>
                <Chip
                  label="+"
                  selected={false}
                  onPress={() =>
                    setFilters({ minWatchCount: filters.minWatchCount + 1 })
                  }
                />
                <Text style={styles.hint}>times</Text>
              </View>

              <Text style={styles.label}>YEAR</Text>
              <RangeInputs
                value={filters.yearRange}
                fallback={DEFAULT_FILTERS.yearRange}
                onChange={yearRange => setFilters({ yearRange })}
              />

              <ChipGroup
                label="GENRE"
                options={facets.genres}
                selected={filters.genres}
                onChange={genres => setFilters({ genres })}
              />
              <ChipGroup
                label="COUNTRY OF ORIGIN"
                options={facets.regions}
                selected={filters.regions}
                onChange={regions => setFilters({ regions })}
              />
              <ChipGroup
                label="LANGUAGE"
                options={facets.languages}
                selected={filters.languages}
                onChange={languages => setFilters({ languages })}
                format={code => code.toUpperCase()}
              />

              <Text style={styles.label}>CAST</Text>
              <TextInput
                style={styles.input}
                placeholder="Actor name"
                autoCorrect={false}
                value={filters.cast.join(', ')}
                onChangeText={text => setFilters({ cast: text.split(',') })}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={selected ? styles.chipTextActive : undefined}>{label}</Text>
    </Pressable>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onChange,
  format = v => v,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  format?: (value: string) => string;
}) {
  const all = Array.from(new Set([...options, ...selected]));
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      {all.length === 0 ? (
        <Text style={styles.hint}>Open a few titles first.</Text>
      ) : (
        <View style={styles.wrap}>
          {all.map(value => {
            const isOn = selected.includes(value);
            return (
              <Chip
                key={value}
                label={format(value)}
                selected={isOn}
                onPress={() =>
                  onChange(
                    isOn
                      ? selected.filter(v => v !== value)
                      : [...selected, value],
                  )
                }
              />
            );
          })}
        </View>
      )}
    </>
  );
}

function RangeInputs({
  value,
  fallback,
  onChange,
}: {
  value: FilterState['ratingRange'];
  fallback: FilterState['ratingRange'];
  onChange: (next: [number, number]) => void;
}) {
  const [draft, setDraft] = useState([String(value[0]), String(value[1])]);

  useEffect(() => setDraft([String(value[0]), String(value[1])]), [value]);

  const commit = () => {
    const parse = (text: string, i: number) => {
      const n = parseInt(text, 10);
      return Number.isNaN(n) ? fallback[i] : n;
    };
    const lo = parse(draft[0], 0);
    const hi = parse(draft[1], 1);
    onChange(lo <= hi ? [lo, hi] : [hi, lo]);
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.rangeInput]}
        keyboardType="number-pad"
        value={draft[0]}
        onChangeText={t => setDraft([t, draft[1]])}
        onEndEditing={commit}
      />
      <Text style={styles.hint}>to</Text>
      <TextInput
        style={[styles.input, styles.rangeInput]}
        keyboardType="number-pad"
        value={draft[1]}
        onChangeText={t => setDraft([draft[0], t])}
        onEndEditing={commit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  triggerText: { fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  link: { color: '#007aff', fontWeight: '500' },
  done: { fontWeight: '700' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginTop: 18,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  segmented: { flexDirection: 'row', gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
  },
  rangeInput: { width: 80 },
  hint: { color: '#999', fontSize: 13 },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 16,
  },
  chipActive: { backgroundColor: '#333' },
  chipTextActive: { color: 'white', fontWeight: '600' },
});
