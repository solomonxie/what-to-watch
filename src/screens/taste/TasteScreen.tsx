import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  usePrefsStore,
  type Facet,
  type Preferences,
} from '../../prefs/prefsStore';
import { countryName, languageName } from '../../config/taxonomy';
import {
  GroupedSection,
  Row,
  SectionLabel,
  Segmented,
} from '../../ui/components';
import { RankedList, type RankedItem } from '../../ui/RankedList';
import { space, type, useColors } from '../../ui/theme';
import type { TasteStackParamList } from '../../navigation/types';

const FACETS: { facet: Facet; label: string; add: string }[] = [
  { facet: 'genres', label: 'Genres', add: 'Add genre…' },
  { facet: 'topics', label: 'Topics', add: 'Add topic…' },
  { facet: 'languages', label: 'Languages', add: 'Add language…' },
  { facet: 'countries', label: 'Countries', add: 'Add country…' },
];

const TYPES: { value: Preferences['mediaTypes']; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
];

export function facetItems(prefs: Preferences, facet: Facet): RankedItem[] {
  switch (facet) {
    case 'topics':
      return prefs.topics.map(t => ({ key: String(t.id), label: t.name }));
    case 'languages':
      return prefs.languages.map(code => ({
        key: code,
        label: languageName(code),
      }));
    case 'countries':
      return prefs.countries.map(code => ({
        key: code,
        label: countryName(code),
      }));
    default:
      return prefs.genres.map(name => ({ key: name, label: name }));
  }
}

export function reorderFacet(
  prefs: Preferences,
  facet: Facet,
  keys: string[],
): Partial<Preferences> {
  if (facet === 'topics') {
    const byId = new Map(prefs.topics.map(t => [String(t.id), t]));
    return { topics: keys.map(k => byId.get(k)!).filter(Boolean) };
  }
  return { [facet]: keys };
}

export function TasteScreen() {
  const c = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<TasteStackParamList>>();
  const { prefs, load, update } = usePrefsStore();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!prefs) load();
  }, [prefs, load]);

  if (!prefs) return null;

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={!dragging}
      contentContainerStyle={styles.content}
    >
      <View style={styles.types}>
        <Segmented
          options={TYPES}
          value={prefs.mediaTypes}
          onChange={mediaTypes => update({ mediaTypes })}
        />
      </View>
      <GroupedSection footer="Recommend only what streams on the services you turned on in Settings.">
        <Row
          label="Only on my services"
          toggle={{
            value: prefs.onlyMyServices,
            onChange: v => update({ onlyMyServices: v }),
          }}
        />
      </GroupedSection>

      {FACETS.map(({ facet, label, add }) => {
        const items = facetItems(prefs, facet);
        return (
          <View key={facet}>
            <View style={styles.header}>
              <SectionLabel style={styles.label}>{label}</SectionLabel>
              {items.length > 1 ? (
                <Text style={[type.meta, styles.hint, { color: c.tertiary }]}>
                  drag to rank
                </Text>
              ) : null}
            </View>
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <RankedList
                items={items}
                onDragChange={setDragging}
                onReorder={keys => update(reorderFacet(prefs, facet, keys))}
                onRemove={key =>
                  update(
                    reorderFacet(
                      prefs,
                      facet,
                      items.map(i => i.key).filter(k => k !== key),
                    ),
                  )
                }
              />
              {items.length ? (
                <View
                  style={[styles.separator, { backgroundColor: c.separator }]}
                />
              ) : null}
              <Row
                label={add}
                accent
                onPress={() => navigation.navigate('AddFacet', { facet })}
              />
            </View>
          </View>
        );
      })}
      <Text style={[type.meta, styles.footer, { color: c.secondary }]}>
        Higher in a list counts more. Discover switches to picks for you once
        anything is set here.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  types: { paddingTop: space.s, paddingBottom: space.l },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  label: { paddingHorizontal: space.l * 2 },
  hint: { paddingHorizontal: space.l * 2, marginBottom: space.s },
  card: { marginHorizontal: space.l, borderRadius: 12, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.l },
  footer: { paddingHorizontal: space.l * 2, marginTop: space.l },
});
