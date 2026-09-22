import { applyFilters, sortTitles, DEFAULT_FILTERS, type TitleWithMeta } from '../src/state/filterStore';
import type { NormalizedTitle } from '../src/types/domain';

function makeTitle(overrides: Partial<NormalizedTitle>): NormalizedTitle {
  return {
    providerId: 'tmdb',
    externalId: overrides.id ?? '1',
    id: overrides.id ?? '1',
    title: 'Test Title',
    genres: [],
    mediaType: 'movie',
    ratings: [],
    ...overrides,
  };
}

function makeItem(overrides: Partial<NormalizedTitle>, watchCount = 0): TitleWithMeta {
  return { title: makeTitle(overrides), watchCount };
}

describe('applyFilters', () => {
  it('filters by rating range', () => {
    const items = [
      makeItem({ id: '1', primaryRatingScore: 30 }),
      makeItem({ id: '2', primaryRatingScore: 80 }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, ratingRange: [50, 100] });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });

  it('filters by minimum watch count', () => {
    const items = [makeItem({ id: '1' }, 0), makeItem({ id: '2' }, 3)];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, minWatchCount: 1 });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });

  it('filters by genre', () => {
    const items = [
      makeItem({ id: '1', genres: ['Comedy'] }),
      makeItem({ id: '2', genres: ['Drama'] }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, genres: ['Drama'] });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });

  it('filters by year range', () => {
    const items = [
      makeItem({ id: '1', releaseDate: '1990-01-01' }),
      makeItem({ id: '2', releaseDate: '2020-01-01' }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, yearRange: [2000, 2030] });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });
});

describe('sortTitles', () => {
  it('sorts by rating descending', () => {
    const items = [
      makeItem({ id: '1', primaryRatingScore: 30 }),
      makeItem({ id: '2', primaryRatingScore: 80 }),
    ];
    const result = sortTitles(items, { key: 'rating', direction: 'desc' });
    expect(result.map(r => r.title.id)).toEqual(['2', '1']);
  });

  it('sorts by title ascending', () => {
    const items = [makeItem({ id: '1', title: 'Zebra' }), makeItem({ id: '2', title: 'Apple' })];
    const result = sortTitles(items, { key: 'title', direction: 'asc' });
    expect(result.map(r => r.title.id)).toEqual(['2', '1']);
  });
});
