import {
  applyFilters,
  countActiveFilters,
  sortTitles,
  DEFAULT_FILTERS,
  type TitleWithMeta,
} from '../src/state/filterStore';
import type { NormalizedTitle } from '../src/types/domain';

type TestTitle = NormalizedTitle & { castNames?: string[] };

function makeTitle(overrides: Partial<TestTitle>): TestTitle {
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

function makeItem(overrides: Partial<TestTitle>, watchCount = 0): TitleWithMeta<TestTitle> {
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

describe('applyFilters facets', () => {
  it('filters by country of origin', () => {
    const items = [
      makeItem({ id: '1', originCountries: ['US'] }),
      makeItem({ id: '2', originCountries: ['KR'] }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, regions: ['KR', 'JP'] });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });

  it('filters by original language', () => {
    const items = [
      makeItem({ id: '1', originalLanguage: 'en' }),
      makeItem({ id: '2', originalLanguage: 'ja' }),
      makeItem({ id: '3' }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, languages: ['ja'] });
    expect(result.map(r => r.title.id)).toEqual(['2']);
  });

  it('filters by cast with case-insensitive partial names', () => {
    const items = [
      makeItem({ id: '1', castNames: ['Zendaya', 'Timothée Chalamet'] }),
      makeItem({ id: '2', castNames: ['Tom Hanks'] }),
      makeItem({ id: '3' }),
    ];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, cast: ['chalamet', ' '] });
    expect(result.map(r => r.title.id)).toEqual(['1']);
  });

  it('counts only non-default filters', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...DEFAULT_FILTERS, genres: ['Drama'], cast: ['x'], minWatchCount: 1 }),
    ).toBe(3);
  });
});

describe('sortTitles', () => {
  it('keeps source order for popularity and ties', () => {
    const items = [
      makeItem({ id: '1', primaryRatingScore: 50 }),
      makeItem({ id: '2', primaryRatingScore: 90 }),
      makeItem({ id: '3', primaryRatingScore: 50 }),
    ];
    expect(sortTitles(items, { key: 'popularity', direction: 'desc' }).map(r => r.title.id))
      .toEqual(['1', '2', '3']);
    expect(sortTitles(items, { key: 'rating', direction: 'desc' }).map(r => r.title.id))
      .toEqual(['2', '1', '3']);
  });

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
