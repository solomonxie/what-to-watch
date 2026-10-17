// 何式影视评分标准: story (90%) x presentation scale (0.7-1.2) x feel scale (0.8-1.2).

export type Kind = 'film' | 'anime' | 'comic' | 'novel';

export interface Aspect {
  key: string;
  label: string;
  weight: number;
}

export const STORY: Aspect[] = [
  { key: 'plot', label: 'Plot', weight: 0.3 },
  { key: 'logic', label: 'Logic', weight: 0.2 },
  { key: 'characters', label: 'Characters', weight: 0.2 },
  { key: 'pacing', label: 'Pacing', weight: 0.15 },
  { key: 'depth', label: 'Depth', weight: 0.15 },
];

export const PRESENTATION: Record<Kind, Aspect[]> = {
  film: [
    { key: 'acting', label: 'Acting', weight: 0.3 },
    { key: 'visuals', label: 'Visuals', weight: 0.3 },
    { key: 'music', label: 'Music', weight: 0.4 },
  ],
  anime: [
    { key: 'voice', label: 'Voice acting', weight: 0.3 },
    { key: 'art', label: 'Art', weight: 0.4 },
    { key: 'music', label: 'Music', weight: 0.3 },
  ],
  comic: [
    { key: 'panels', label: 'Panels', weight: 0.6 },
    { key: 'aesthetics', label: 'Aesthetics', weight: 0.4 },
  ],
  novel: [{ key: 'prose', label: 'Prose', weight: 1 }],
};

export const FEEL: Aspect = { key: 'feel', label: 'Feel', weight: 1 };
export const STORY_SHARE = 0.9;

export type Scores = Record<string, number>;

const weighted = (aspects: Aspect[], s: Scores) =>
  aspects.reduce((sum, a) => sum + (s[a.key] ?? 0) * a.weight, 0);

export const isComplete = (kind: Kind, s: Scores) =>
  [...STORY, ...PRESENTATION[kind], FEEL].every(a => s[a.key] >= 1);

export interface Result {
  story: number;
  presentationScale: number;
  objective: number;
  feelScale: number;
  final: number;
}

/** Null until every aspect is scored 1-10. Not capped: all 10s give 12.96. */
export function calculate(kind: Kind, s: Scores): Result | null {
  if (!isComplete(kind, s)) return null;
  const story = weighted(STORY, s) * STORY_SHARE;
  const presentationScale =
    0.7 + (weighted(PRESENTATION[kind], s) - 1) * (0.5 / 9);
  const objective = story * presentationScale;
  const feelScale = 0.8 + (s[FEEL.key] - 1) * (0.4 / 9);
  return {
    story,
    presentationScale,
    objective,
    feelScale,
    final: objective * feelScale,
  };
}
