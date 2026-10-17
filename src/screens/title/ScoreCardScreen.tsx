import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  deleteScoreCard,
  getScoreCard,
  saveScoreCard,
} from '../../db/repositories/scoreCardsRepo';
import {
  calculate,
  FEEL,
  PRESENTATION,
  STORY,
  type Aspect,
  type Kind,
  type Scores,
} from '../../scoring/formula';
import { t } from '../../i18n';
import { StarRating } from './StarRating';
import { ChipGrid } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScoreCard'>;

const KINDS: { value: Kind; label: string }[] = [
  { value: 'film', label: 'Film / Show' },
  { value: 'anime', label: 'Anime' },
  { value: 'comic', label: 'Comic' },
  { value: 'novel', label: 'Novel' },
];

const GUIDE = [
  '0.5★ Effort credit only',
  '1★ Awful',
  '1.5★ Hard to watch',
  '2★ Clear flaws',
  '2.5★ Many faults, average',
  '3★ Mixed, passable',
  '3.5★ Good, room to grow',
  '4★ Excellent, minor flaws',
  '4.5★ Benchmark of the field',
  '5★ Unmatched',
];

export function ScoreCardScreen({ navigation, route }: Props) {
  const { titleId } = route.params;
  const c = useColors();
  const [kind, setKind] = useState<Kind>('film');
  const [scores, setScores] = useState<Scores>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getScoreCard(titleId).then(card => {
      if (!card) return;
      setKind(card.kind as Kind);
      setScores(card.scores);
      setSaved(true);
    });
  }, [titleId]);

  const result = calculate(kind, scores);
  const close = () => navigation.goBack();
  const save = async () => {
    if (!result) return;
    await saveScoreCard({
      titleId,
      kind,
      scores,
      finalScore: Math.round(result.final * 10) / 10,
    });
    close();
  };
  const clear = async () => {
    await deleteScoreCard(titleId);
    close();
  };

  const group = (heading: string, note: string, aspects: Aspect[]) => (
    <>
      <View style={styles.heading}>
        <Text style={[type.section, { color: c.secondary }]}>
          {t(heading).toUpperCase()}
        </Text>
        <Text style={[type.meta, { color: c.tertiary }]}>{t(note)}</Text>
      </View>
      {aspects.map(a => (
        <AspectRow
          key={a.key}
          aspect={a}
          value={scores[a.key]}
          onChange={v => setScores(s => ({ ...s, [a.key]: v }))}
        />
      ))}
    </>
  );

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={styles.bar}>
        <Pressable onPress={close} hitSlop={10}>
          <Text style={[styles.action, { color: c.accent }]}>
            {t('Cancel')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>
          {t('Detailed score')}
        </Text>
        <Pressable onPress={save} disabled={!result} hitSlop={10}>
          <Text
            style={[
              styles.action,
              styles.bold,
              { color: result ? c.accent : c.tertiary },
            ]}
          >
            {t('Save')}
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ChipGrid
          options={KINDS.map(k => ({ ...k, label: t(k.label) }))}
          isSelected={v => v === kind}
          onPress={setKind}
        />
        {group('Story', '90% of the score · what is told', STORY)}
        {group(
          'Presentation',
          'scales the story 0.7–1.2 · how well it is told',
          PRESENTATION[kind],
        )}
        {group('Feel', 'scales the result 0.8–1.2 · personal taste', [FEEL])}
        <Text style={[type.meta, styles.guide, { color: c.tertiary }]}>
          {GUIDE.map(t).join('\n')}
        </Text>
        {saved ? (
          <Pressable onPress={clear} hitSlop={8}>
            <Text style={[styles.remove, { color: c.danger }]}>
              {t('Remove detailed score')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={[styles.result, { borderTopColor: c.separator }]}>
        {result ? (
          <>
            <Text style={[styles.final, { color: c.text }]}>
              {result.final.toFixed(1)}
            </Text>
            <Text style={[type.meta, { color: c.secondary }]}>
              {[
                `${t('story')} ${result.story.toFixed(2)}`,
                `${t('presentation')} ${result.presentationScale.toFixed(2)}`,
                `${t('feel')} ${result.feelScale.toFixed(2)}`,
              ].join(' × ')}
            </Text>
          </>
        ) : (
          <Text style={[type.meta, { color: c.secondary }]}>
            {t('Score every aspect to see the result')}
          </Text>
        )}
      </View>
    </View>
  );
}

function AspectRow({
  aspect,
  value,
  onChange,
}: {
  aspect: Aspect;
  value?: number;
  onChange: (v: number) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={[styles.label, { color: c.text }]}>{t(aspect.label)}</Text>
        {aspect.weight < 1 ? (
          <Text style={[type.meta, { color: c.tertiary }]}>
            {`${Math.round(aspect.weight * 100)}%`}
          </Text>
        ) : null}
      </View>
      <View style={styles.stars}>
        <StarRating
          value={value ?? 0}
          onChange={onChange}
          size={40}
          showValue={false}
          cycle
        />
        {value ? (
          <Text style={[type.meta, { color: c.secondary }]}>{`${
            value / 2
          }★`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space.l,
  },
  title: { fontSize: 17, fontWeight: '600' },
  action: { fontSize: 17 },
  bold: { fontWeight: '600' },
  content: { paddingBottom: space.xl },
  heading: { paddingHorizontal: space.l, marginTop: space.xl, gap: 2 },
  row: { paddingHorizontal: space.l, marginTop: space.m, gap: 6 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16 },
  guide: { paddingHorizontal: space.l, marginTop: space.xl, lineHeight: 18 },
  remove: {
    fontSize: 15,
    paddingHorizontal: space.l,
    marginTop: space.xl,
  },
  result: {
    alignItems: 'center',
    paddingVertical: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  final: { fontSize: 34, fontWeight: '800' },
});
