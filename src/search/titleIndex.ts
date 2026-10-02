import Fuse from 'fuse.js';
import type { ProviderSearchResult } from '../types/domain';

export interface SearchableTitle {
  id: string;
  title: string;
  originalTitle?: string | null;
  zhTitle?: string | null;
  genres: string[];
  castNames?: string[] | null;
  posterPath?: string | null;
  releaseDate?: string | null;
  mediaType?: string;
  primaryRatingScore?: number | null;
}

interface Entry {
  item: SearchableTitle;
  names: string[];
  cast: string[];
  genres: string[];
}

export interface Hit<T> {
  item: T;
  score: number;
}

let entries = new Map<string, Entry>();
let built = false;
// Typo tolerance over titles only, built on first need.
let fuzzy: Fuse<Entry> | null = null;

function stripAccents(text: string): string {
  try {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return text;
  }
}

// ASCII and CJK punctuation; letters of any script stay.
const SEPARATORS =
  /[\s!-/:-@[-`{-~\u00a0-\u00bf\u2000-\u206f\u3000-\u303f\uff01-\uff0f]+/g;

export function normalize(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(SEPARATORS, ' ')
    .trim();
}

/** 0–100: exact title, then title prefix, whole word, word prefix, substring. */
export function titleScore(query: string, name: string): number {
  if (!query || !name) return 0;
  if (name === query) return 100;
  if (name.startsWith(`${query} `)) return 90;
  if (name.startsWith(query)) return 85;
  const padded = ` ${name} `;
  if (padded.includes(` ${query} `)) return 80;
  if (padded.includes(` ${query}`)) return 70;
  if (name.includes(query)) return 60;
  const words = name.split(' ');
  const all = query.split(' ').every(q => words.some(w => w.startsWith(q)));
  return all ? 50 : 0;
}

function entryScore(query: string, e: Entry): number {
  const title = Math.max(0, ...e.names.map(n => titleScore(query, n)));
  if (title) return title;
  if (e.cast.some(n => titleScore(query, n) >= 70)) return 40;
  if (e.genres.includes(query)) return 20;
  return 0;
}

function toEntry(t: SearchableTitle): Entry {
  return {
    item: t,
    names: [t.title, t.originalTitle, t.zhTitle]
      .filter((n): n is string => !!n)
      .map(normalize),
    cast: (t.castNames ?? []).map(normalize),
    genres: t.genres.map(normalize),
  };
}

export function buildSearchIndex(titles: SearchableTitle[]): void {
  entries = new Map(titles.map(t => [t.id, toEntry(t)]));
  fuzzy = null;
  built = true;
}

export const isSearchIndexBuilt = () => built;

export function upsertSearchIndex(title: SearchableTitle): void {
  entries.set(title.id, toEntry(title));
  fuzzy = null;
}

export function searchIndex(query: string, limit = 20): Hit<SearchableTitle>[] {
  const q = normalize(query);
  if (!q) return [];
  const hits: Hit<SearchableTitle>[] = [];
  for (const e of entries.values()) {
    const score = entryScore(q, e);
    if (score) hits.push({ item: e.item, score });
  }
  if (hits.length === 0 && q.length >= 3) {
    fuzzy ??= new Fuse([...entries.values()], {
      keys: ['names'],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
    });
    for (const r of fuzzy.search(q, { limit })) {
      hits.push({ item: r.item.item, score: Math.round(30 * (1 - r.score!)) });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface Rankable {
  key: string;
  inLibrary: boolean;
  /** TMDB's own order (popularity); absent for local-only titles. */
  order?: number;
}

/** Relevance first; library membership, then TMDB's order, only break ties. */
export function rankResults<T extends Rankable>(hits: Hit<T>[]): Hit<T>[] {
  return [...hits].sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.item.inLibrary) - Number(a.item.inLibrary) ||
      (a.item.order ?? Infinity) - (b.item.order ?? Infinity),
  );
}

export interface SearchRow extends Rankable {
  title: string;
  posterPath?: string | null;
  year?: string;
  mediaType?: string;
  rating?: number | null;
  /** Cached locally, so it opens without fetching. */
  cached: boolean;
  remote?: ProviderSearchResult;
}

/** Local and TMDB results as one list, best match first. */
export function mergeResults(
  query: string,
  local: Hit<SearchableTitle>[],
  remote: ProviderSearchResult[],
  library: Set<string>,
): SearchRow[] {
  const q = normalize(query);
  const rows = new Map<string, Hit<SearchRow>>();
  for (const { item: t, score } of local) {
    rows.set(t.id, {
      score,
      item: {
        key: t.id,
        title: t.title,
        posterPath: t.posterPath,
        year: t.releaseDate?.slice(0, 4),
        mediaType: t.mediaType,
        rating: t.primaryRatingScore,
        cached: true,
        inLibrary: library.has(t.id),
      },
    });
  }
  remote.forEach((r, order) => {
    const key = `${r.mediaType}:${r.externalId}`;
    const score = Math.max(
      ...[r.title, r.originalTitle].map(n =>
        n ? titleScore(q, normalize(n)) : 0,
      ),
    );
    const known = rows.get(key);
    if (known) {
      known.score = Math.max(known.score, score);
      known.item.order = order;
      return;
    }
    rows.set(key, {
      score,
      item: {
        key,
        title: r.title,
        posterPath: r.posterPath,
        year: r.year ? String(r.year) : undefined,
        mediaType: r.mediaType,
        cached: false,
        inLibrary: library.has(key),
        order,
        remote: r,
      },
    });
  });
  return rankResults([...rows.values()]).map(h => h.item);
}
