import { create } from 'zustand';
import { matchesAgeGroup } from '../catalog/ageRating';
import { hasGenre } from '../config/taxonomy';
import type { FilterState, SortState, TitleKind } from '../types/domain';

export const DEFAULT_FILTERS: FilterState = {
  kinds: [],
  ages: [],
  ratingRange: [0, 100],
  minWatchCount: 0,
  genres: [],
  yearRange: [1900, new Date().getFullYear() + 1],
  regions: [],
  languages: [],
  cast: [],
};

export const DEFAULT_SORT: SortState = {
  key: 'popularity',
  direction: 'desc',
};

export interface FilterableTitle {
  id: string;
  title: string;
  mediaType?: string;
  certification?: string | null;
  primaryRatingScore?: number | null;
  releaseDate?: string | null;
  genres: string[];
  originalLanguage?: string | null;
  originCountries?: string[] | null;
  castNames?: string[] | null;
}

export interface TitleWithMeta<T extends FilterableTitle = FilterableTitle> {
  title: T;
  watchCount: number;
}

function yearOf(title: FilterableTitle): number | undefined {
  const year = title.releaseDate
    ? parseInt(title.releaseDate.slice(0, 4), 10)
    : NaN;
  return Number.isNaN(year) ? undefined : year;
}

const UNSCRIPTED = ['Reality', 'Talk', 'News'];

export function kindOf(title: FilterableTitle): TitleKind {
  const tv = title.mediaType === 'tv';
  if (title.genres.includes('Documentary'))
    return tv ? 'docuseries' : 'documentary';
  if (tv && title.genres.some(g => UNSCRIPTED.includes(g))) return 'unscripted';
  return tv ? 'series' : 'movie';
}

function matchesAny(selected: string[], values?: string[] | null): boolean {
  if (selected.length === 0) return true;
  return selected.some(v => (values ?? []).includes(v));
}

function matchesCast(queries: string[], castNames?: string[] | null): boolean {
  const needles = queries.map(q => q.trim().toLowerCase()).filter(Boolean);
  if (needles.length === 0) return true;
  const names = (castNames ?? []).map(n => n.toLowerCase());
  return needles.some(needle => names.some(name => name.includes(needle)));
}

export function countActiveFilters(filters: FilterState): number {
  const d = DEFAULT_FILTERS;
  return [
    filters.kinds.length > 0,
    filters.ages.length > 0,
    filters.ratingRange[0] !== d.ratingRange[0] ||
      filters.ratingRange[1] !== d.ratingRange[1],
    filters.minWatchCount !== d.minWatchCount,
    filters.yearRange[0] !== d.yearRange[0] ||
      filters.yearRange[1] !== d.yearRange[1],
    filters.genres.length > 0,
    filters.regions.length > 0,
    filters.languages.length > 0,
    filters.cast.some(c => c.trim()),
  ].filter(Boolean).length;
}

export function applyFilters<T extends FilterableTitle>(
  items: TitleWithMeta<T>[],
  filters: FilterState,
): TitleWithMeta<T>[] {
  return items.filter(({ title, watchCount }) => {
    const score = title.primaryRatingScore ?? 0;
    if (score < filters.ratingRange[0] || score > filters.ratingRange[1])
      return false;
    if (watchCount < filters.minWatchCount) return false;
    if (filters.kinds.length && !filters.kinds.includes(kindOf(title)))
      return false;
    if (
      filters.ages.length &&
      !filters.ages.some(group => matchesAgeGroup(title, group))
    )
      return false;
    if (
      filters.genres.length &&
      !filters.genres.some(g => hasGenre(g, title.genres, title.mediaType))
    )
      return false;

    const year = yearOf(title);
    if (
      year !== undefined &&
      (year < filters.yearRange[0] || year > filters.yearRange[1])
    ) {
      return false;
    }

    if (!matchesAny(filters.regions, title.originCountries)) return false;
    if (
      !matchesAny(
        filters.languages,
        title.originalLanguage ? [title.originalLanguage] : [],
      )
    ) {
      return false;
    }
    return matchesCast(filters.cast, title.castNames);
  });
}

export function sortTitles<T extends FilterableTitle>(
  items: TitleWithMeta<T>[],
  sort: SortState,
): TitleWithMeta<T>[] {
  const dir = sort.direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => dir * compare(a, b));

  function compare(a: TitleWithMeta<T>, b: TitleWithMeta<T>): number {
    switch (sort.key) {
      case 'rating':
        return (
          (a.title.primaryRatingScore ?? 0) - (b.title.primaryRatingScore ?? 0)
        );
      case 'year':
        return (yearOf(a.title) ?? 0) - (yearOf(b.title) ?? 0);
      case 'title':
        return a.title.title.localeCompare(b.title.title);
      default:
        return 0;
    }
  }
}

interface FilterStore {
  filters: FilterState;
  sort: SortState;
  setFilters: (patch: Partial<FilterState>) => void;
  setSort: (sort: SortState) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStore>(set => ({
  filters: DEFAULT_FILTERS,
  sort: DEFAULT_SORT,
  setFilters: patch =>
    set(state => ({ filters: { ...state.filters, ...patch } })),
  setSort: sort => set({ sort }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, sort: DEFAULT_SORT }),
}));
