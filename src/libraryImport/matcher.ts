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
  }
  if (entry.mediaType && entry.mediaType === c.details.mediaType) score += 0.1;
  score += Math.min(0.05, c.popularity / 2000);
  return score;
}

export const MATCH_THRESHOLD = 0.6;

export function bestMatch(
  entry: ImportEntry,
  candidates: DiscoveredTitleMeta[],
) {
  let best: { c: DiscoveredTitleMeta; score: number } | null = null;
  for (const c of candidates) {
    const score = matchScore(entry, c);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score))
      best = { c, score };
  }
  return best?.c ?? null;
}
