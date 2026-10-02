import { getKv, setKv } from '../db/repositories/kvRepo';
import { AGES, countryName, KINDS, languageName } from '../config/taxonomy';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  countActiveFilters,
} from './filterStore';
import type { FilterState, SortState } from '../types/domain';

const KEY = 'filters.history';
export const MAX_FILTER_HISTORY = 10;

export interface FilterHistoryEntry {
  filters: FilterState;
  sort: SortState;
}

const SORT_LABELS: Record<string, string> = {
  rating: 'by rating',
  year: 'by year',
  title: 'A–Z',
};

const labelOf = (options: { value: string; label: string }[], v: string) =>
  options.find(o => o.value === v)?.label ?? v;

function yearLabel([from, to]: [number, number]): string | null {
  const [anyFrom, anyTo] = DEFAULT_FILTERS.yearRange;
  if (from === anyFrom && to === anyTo) return null;
  if (from === to) return String(from);
  if (from % 10 === 0 && (to === from + 9 || to === anyTo)) return `${from}s`;
  if (from === anyFrom) return `Before ${to + 1}`;
  return `${from}–${to}`;
}

/** One line, e.g. "Series · ★ 7+ · Adults 17+ · Thriller · English". */
export function describeFilters({ filters: f, sort }: FilterHistoryEntry) {
  const parts = [
    ...f.kinds.map(k => labelOf(KINDS, k)),
    yearLabel(f.yearRange),
    f.ratingRange[0] > 0 ? `★ ${f.ratingRange[0] / 10}+` : null,
    ...f.ages.map(a => labelOf(AGES, a)),
    ...f.certifications,
    ...f.genres,
    ...f.languages.map(languageName),
    ...f.regions.map(countryName),
    ...f.cast.map(n => n.trim()).filter(Boolean),
    SORT_LABELS[sort.key],
  ];
  return parts.filter(Boolean).join(' · ') || 'No filters';
}

const keyOf = (e: FilterHistoryEntry) =>
  JSON.stringify([e.filters, e.sort.key]);

/** Newest first; a repeat moves to the top; defaults aren't kept. */
export function withEntry(
  history: FilterHistoryEntry[],
  entry: FilterHistoryEntry,
): FilterHistoryEntry[] {
  const cast = entry.filters.cast.map(n => n.trim()).filter(Boolean);
  const clean = { ...entry, filters: { ...entry.filters, cast } };
  if (
    countActiveFilters(clean.filters) === 0 &&
    clean.sort.key === DEFAULT_SORT.key
  )
    return history;
  const key = keyOf(clean);
  return [clean, ...history.filter(h => keyOf(h) !== key)].slice(
    0,
    MAX_FILTER_HISTORY,
  );
}

export async function getFilterHistory(): Promise<FilterHistoryEntry[]> {
  const raw = await getKv(KEY);
  return raw ? (JSON.parse(raw) as FilterHistoryEntry[]) : [];
}

export async function saveFilterHistory(
  history: FilterHistoryEntry[],
): Promise<void> {
  await setKv(KEY, JSON.stringify(history));
}
