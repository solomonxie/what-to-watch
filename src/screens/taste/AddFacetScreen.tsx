import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePrefsStore, type Topic } from '../../prefs/prefsStore';
import {
  COUNTRIES,
  GENRES,
  LANGUAGES,
  genreLabel,
} from '../../config/taxonomy';
import { searchKeywords } from '../../providers/tmdbProvider';
import { GroupedSection, Row } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import type { TasteStackParamList } from '../../navigation/types';
import { t } from '../../i18n';

type Props = NativeStackScreenProps<TasteStackParamList, 'AddFacet'>;

const TITLES = {
  genres: t('Add genre'),
  topics: t('Add topic'),
  languages: t('Add language'),
  countries: t('Add country'),
};

export function AddFacetScreen({ route, navigation }: Props) {
  const { facet } = route.params;
  const c = useColors();
  const { prefs, update } = usePrefsStore();
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(
    () => navigation.setOptions({ title: TITLES[facet] }),
    [navigation, facet],
  );

  useEffect(() => {
    if (facet !== 'topics' || !query.trim()) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchKeywords(query.trim());
        if (!cancelled) {
          setTopics(results);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [facet, query]);

  const options = useMemo((): Array<{ key: string; label: string }> => {
    const q = query.trim().toLowerCase();
    const match = (label: string) => !q || label.toLowerCase().includes(q);
    switch (facet) {
      case 'genres':
        return GENRES.filter(
          g => match(g.name) || match(genreLabel(g.name)),
        ).map(g => ({
          key: g.name,
          label: genreLabel(g.name),
        }));
      case 'languages':
        return LANGUAGES.filter(([, n]) => match(n) || match(t(n))).map(
          ([k, n]) => ({
            key: k,
            label: t(n),
          }),
        );
      case 'countries':
        return COUNTRIES.filter(([, n]) => match(n) || match(t(n))).map(
          ([k, n]) => ({
            key: k,
            label: t(n),
          }),
        );
      default:
        return topics.map(tp => ({ key: String(tp.id), label: tp.name }));
    }
  }, [facet, query, topics]);

  if (!prefs) return null;

  const selected = new Set<string>(
    facet === 'topics' ? prefs.topics.map(tp => String(tp.id)) : prefs[facet],
  );

  const toggle = (key: string, label: string) => {
    if (facet === 'topics') {
      const id = Number(key);
      update({
        topics: selected.has(key)
          ? prefs.topics.filter(tp => tp.id !== id)
          : [...prefs.topics, { id, name: label }],
      });
    } else {
      const list = prefs[facet];
      update({
        [facet]: selected.has(key)
          ? list.filter(k => k !== key)
          : [...list, key],
      });
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
    >
      <View style={[styles.search, { backgroundColor: c.card }]}>
        <TextInput
          style={[type.body, styles.input, { color: c.text }]}
          placeholder={
            facet === 'topics'
              ? t('Search topics, e.g. time travel')
              : t('Filter')
          }
          placeholderTextColor={c.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoFocus={facet === 'topics'}
          clearButtonMode="while-editing"
        />
        {searching ? <ActivityIndicator /> : null}
      </View>
      {error ? (
        <Text style={[type.meta, styles.note, { color: c.danger }]}>
          ⚠ {error}
        </Text>
      ) : null}
      {facet === 'topics' && !query.trim() ? (
        <Text style={[type.meta, styles.note, { color: c.secondary }]}>
          {t('Topics are TMDB keywords — heist, time travel, based on novel…')}
        </Text>
      ) : null}
      {options.length ? (
        <GroupedSection>
          {options.map(o => (
            <Row
              key={o.key}
              label={o.label}
              value={selected.has(o.key) ? '✓' : '+'}
              onPress={() => toggle(o.key, o.label)}
              chevron={false}
            />
          ))}
        </GroupedSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.s, paddingBottom: 120 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.l,
    marginBottom: space.l,
    borderRadius: 10,
    paddingHorizontal: space.m,
  },
  input: { flex: 1, paddingVertical: 10 },
  note: { paddingHorizontal: space.l * 2, marginBottom: space.m },
});
