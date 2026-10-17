import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  usePrefsStore,
  type Facet,
  type Preferences,
} from '../../prefs/prefsStore';
import { countryName, genreLabel, languageName } from '../../config/taxonomy';
import {
  GroupedSection,
  Row,
  SectionLabel,
  Segmented,
} from '../../ui/components';
import { RankedList, type RankedItem } from '../../ui/RankedList';
import { space, type, useColors } from '../../ui/theme';
import type { TasteStackParamList } from '../../navigation/types';
import { t } from '../../i18n';

const FACETS: { facet: Facet; label: string; add: string }[] = [
  { facet: 'genres', label: t('Genres'), add: t('Add genre…') },
  { facet: 'topics', label: t('Topics'), add: t('Add topic…') },
  { facet: 'languages', label: t('Languages'), add: t('Add language…') },
  { facet: 'countries', label: t('Countries'), add: t('Add country…') },
];

const TYPES: { value: Preferences['mediaTypes']; label: string }[] = [
  { value: 'both', label: t('Both') },
  { value: 'movie', label: t('Movies') },
  { value: 'tv', label: t('Shows') },
];

export function facetItems(prefs: Preferences, facet: Facet): RankedItem[] {
  switch (facet) {
    case 'topics':
      return prefs.topics.map(tp => ({ key: String(tp.id), label: tp.name }));
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
      return prefs.genres.map(name => ({ key: name, label: genreLabel(name) }));
  }
}

export function reorderFacet(
  prefs: Preferences,
  facet: Facet,
  keys: string[],
): Partial<Preferences> {
  if (facet === 'topics') {
    const byId = new Map(prefs.topics.map(tp => [String(tp.id), tp]));
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
      <GroupedSection
        footer={t(
          'Recommend only what streams on the services you turned on in Settings.',
        )}
      >
        <Row
          label={t('Only on my services')}
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
                  {t('drag to rank')}
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
        {t(
          'Higher in a list counts more. Discover switches to picks for you once anything is set here.',
        )}
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
