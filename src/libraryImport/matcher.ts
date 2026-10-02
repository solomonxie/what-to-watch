import type { ImportEntry } from './types';
import type { DiscoveredTitleMeta } from '../providers/tmdbProvider';

export function normalizeTitle(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

export const hasCjk = (s: string) => /[぀-ヿ㐀-鿿가-힯]/.test(s);

function yearOf(date?: string): number | undefined {
  const y = date ? parseInt(date.slice(0, 4), 10) : NaN;
  return Number.isNaN(y) ? undefined : y;
}

/** 0 when the candidate can't be the entry; higher is a better match. */
export function matchScore(entry: ImportEntry, c: DiscoveredTitleMeta): number {
  const names = [c.details.title, c.details.originalTitle]
    .filter(Boolean)
    .map(n => normalizeTitle(n!));
  let title = 0;
  for (const t of entry.titles) {
    const n = normalizeTitle(t);
    if (!n) continue;
    if (names.includes(n)) title = Math.max(title, 1);
    else if (
      names.some(x => x.length > 2 && (x.includes(n) || n.includes(x)))
    ) {
      title = Math.max(title, 0.6);
    }
  }
  if (title === 0) return 0;
  let score = title;
  const year = yearOf(c.details.releaseDate);
  if (entry.year && year) {
    const diff = Math.abs(entry.year - year);
    score += diff === 0 ? 0.3 : diff === 1 ? 0.15 : -0.5;
  } else if (entry.year) {
    score -= 0.2;
  }
  if (entry.mediaType && entry.mediaType === c.details.mediaType) score += 0.1;
  score += Math.min(0.05, c.popularity / 2000);
  return score;
}

const CN_DIGITS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};
const ROMAN: Record<string, number> = {
  Ⅱ: 2,
  Ⅲ: 3,
  Ⅳ: 4,
  Ⅴ: 5,
  Ⅵ: 6,
  Ⅶ: 7,
  Ⅷ: 8,
  Ⅸ: 9,
  Ⅹ: 10,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};
const cnNumber = (s: string) =>
  /^\d+$/.test(s)
    ? Number(s)
    : s.length === 2 && s[0] === '十'
    ? 10 + CN_DIGITS[s[1]]
    : s.length === 2 && s[1] === '十'
    ? CN_DIGITS[s[0]] * 10
    : CN_DIGITS[s];

// "第三季", "第2期", "Season 4", "4th Season", "2nd season", "最终季", trailing "Ⅲ"/" III".
const SEASON_MARKERS: [RegExp, (m: RegExpMatchArray) => number | undefined][] =
  [
    [/第\s*([一二三四五六七八九十\d]+)\s*[季期部]/, m => cnNumber(m[1])],
    [/\bSeason\s*(\d+)/i, m => Number(m[1])],
    [/\b(\d+)(?:st|nd|rd|th)\s+Season\b/i, m => Number(m[1])],
    [/(?:最终|最後|最后)季|\bFinal Season\b/i, () => undefined],
    [/\s*(Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|Ⅶ|Ⅷ|Ⅸ|Ⅹ)(?=[\s:：]|$)/, m => ROMAN[m[1]]],
    [/\s+(II|III|IV|V|VI)(?=[\s:：]|$)/, m => ROMAN[m[1]]],
  ];

/** A season-specific listing's number and its names without the marker. */
export function seasonOf(
  titles: string[],
): { season?: number; titles: string[] } | null {
  let found = false;
  let season: number | undefined;
  const stripped = titles.map(t => {
    let out = t;
    for (const [re, num] of SEASON_MARKERS) {
      const m = out.match(re);
      if (!m) continue;
      found = true;
      season ??= num(m);
      out = out.replace(re, ' ');
    }
    return out.replace(/[\s:：～~-]+$/, '').trim();
  });
  return found
    ? { season, titles: Array.from(new Set(stripped.filter(Boolean))) }
    : null;
}

/** The number on "龙樱2" or "拳愿阿修罗 Part.2"; a 4-digit year doesn't count. */
export function sequelNumber(titles: string[]): number | undefined {
  for (const t of titles) {
    const m = t.trim().match(/(?:Part\.?\s*(\d{1,2})|(?:^|[^\d])(\d{1,2}))$/i);
    const n = m && Number(m[1] ?? m[2]);
    if (n && n > 1) return n;
  }
  return undefined;
}

/**
 * The series name under an arc, part or numbered sequel:
 * "鬼灭之刃：游郭篇" → "鬼灭之刃", "龙樱2" → "龙樱", "拳愿阿修罗 Part.2" → "拳愿阿修罗".
 */
export function seriesNames(titles: string[]): string[] {
  const bases = titles.flatMap(t => [
    t.split(/\s*[：:]\s*/)[0],
    t.split(/\s+/)[0],
    t.replace(/\s*(?:Part\.?\s*\d+|\d{1,2})$/i, ''),
  ]);
  // A lone English word ("Magnetic", "Randy") names too many things.
  const specific = (b: string) =>
    hasCjk(b) ? b.length >= 2 : /\S\s+\S/.test(b);
  return Array.from(new Set(bases.map(b => b.trim()).filter(specific))).filter(
    b => !titles.includes(b),
  );
}

/** "辛巴达历险记2013" → a remake: that name, that year exactly. */
export function remakeOf(
  titles: string[],
): { titles: string[]; year: number } | null {
  for (const t of titles) {
    const m = t.match(/^(.{2,}?)\s*((?:19|20)\d\d)$/);
    if (m) return { titles: [m[1]], year: Number(m[2]) };
  }
  return null;
}

export const MATCH_THRESHOLD = 0.6;

/** Exact name and year: no other of the row's names can do better. */
export const CERTAIN_MATCH = 1.3;

export function bestScored(
  entry: ImportEntry,
  candidates: DiscoveredTitleMeta[],
): { c: DiscoveredTitleMeta; score: number } | null {
  let best: { c: DiscoveredTitleMeta; score: number } | null = null;
  for (const c of candidates) {
    const score = matchScore(entry, c);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score))
      best = { c, score };
  }
  return best;
}

export function bestMatch(
  entry: ImportEntry,
  candidates: DiscoveredTitleMeta[],
) {
  return bestScored(entry, candidates)?.c ?? null;
}
