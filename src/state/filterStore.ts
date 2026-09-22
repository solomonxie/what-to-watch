import { create } from 'zustand';
import type { FilterState, NormalizedTitle, SortState } from '../types/domain';

export const DEFAULT_FILTERS: FilterState = {
  ratingRange: [0, 100],
  minWatchCount: 0,
  genres: [],
  yearRange: [1900, new Date().getFullYear() + 1],
  regions: [],
  languages: [],
  cast: [],
};

export const DEFAULT_SORT: SortState = {
  key: 'rating',
  direction: 'desc',
};

export interface TitleWithMeta {
  title: NormalizedTitle;
  watchCount: number;
}

export function applyFilters(
  items: TitleWithMeta[],
  filters: FilterState,
): TitleWithMeta[] {
  return items.filter(({ title, watchCount }) => {
    const score = title.primaryRatingScore ?? 0;
    if (score < filters.ratingRange[0] || score > filters.ratingRange[1]) {
      return false;
    }
    if (watchCount < filters.minWatchCount) return false;

    if (filters.genres.length > 0) {
      const hasGenre = filters.genres.some(g => title.genres.includes(g));
      if (!hasGenre) return false;
    }

    const year = title.releaseDate ? parseInt(title.releaseDate.slice(0, 4), 10) : undefined;
    if (year !== undefined) {
      if (year < filters.yearRange[0] || year > filters.yearRange[1]) return false;
    }

    return true;
  });
}

export function sortTitles(
  items: TitleWithMeta[],
  sort: SortState,
): TitleWithMeta[] {
  const sorted = [...items].sort((a, b) => {
    switch (sort.key) {
      case 'rating':
        return (a.title.primaryRatingScore ?? 0) - (b.title.primaryRatingScore ?? 0);
      case 'year': {
        const ay = a.title.releaseDate ? parseInt(a.title.releaseDate.slice(0, 4), 10) : 0;
        const by = b.title.releaseDate ? parseInt(b.title.releaseDate.slice(0, 4), 10) : 0;
        return ay - by;
      }
      case 'title':
        return a.title.title.localeCompare(b.title.title);
      case 'recentlyAdded':
        return 0;
      default:
        return 0;
    }
  });
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
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
