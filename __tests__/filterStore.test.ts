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

describe('applyFilters genres across movie and tv', () => {
  // TMDB tv genres are combos ("Sci-Fi & Fantasy") and have no Thriller.
  const items = [
    makeItem({ id: 'tv-mystery', mediaType: 'tv', genres: ['Mystery', 'Drama'] }),
    makeItem({ id: 'tv-action', mediaType: 'tv', genres: ['Action & Adventure'] }),
    makeItem({ id: 'tv-scifi', mediaType: 'tv', genres: ['Sci-Fi & Fantasy'] }),
    makeItem({ id: 'movie-thriller', genres: ['Thriller'] }),
    makeItem({ id: 'movie-mystery', genres: ['Mystery'] }),
  ];
  const ids = (genres: string[]) =>
    applyFilters(items, { ...DEFAULT_FILTERS, genres }).map(r => r.title.id);

  it('matches tv thrillers, filed under Mystery', () => {
    expect(ids(['Thriller'])).toEqual(['tv-mystery', 'movie-thriller']);
  });

  it('matches tv combo genres by their unified names', () => {
    expect(ids(['Action'])).toEqual(['tv-action']);
    expect(ids(['Science Fiction'])).toEqual(['tv-scifi']);
    expect(ids(['Fantasy'])).toEqual(['tv-scifi']);
  });

  it('finds English series thrillers rated 7+', () => {
    const shows = [
      makeItem({ id: 'hit', mediaType: 'tv', genres: ['Mystery', 'Crime'], originalLanguage: 'en', primaryRatingScore: 78 }),
      makeItem({ id: 'low', mediaType: 'tv', genres: ['Mystery'], originalLanguage: 'en', primaryRatingScore: 61 }),
      makeItem({ id: 'ko', mediaType: 'tv', genres: ['Mystery'], originalLanguage: 'ko', primaryRatingScore: 85 }),
    ];
    const result = applyFilters(shows, {
      ...DEFAULT_FILTERS,
      kinds: ['series'],
      genres: ['Thriller'],
      languages: ['en'],
      ratingRange: [70, 100],
    });
    expect(result.map(r => r.title.id)).toEqual(['hit']);
  });
});

describe('applyFilters kinds', () => {
  it('splits movies, series, documentaries and unscripted TV', () => {
    const items = [
      makeItem({ id: 'm' }),
      makeItem({ id: 's', mediaType: 'tv', genres: ['Drama'] }),
      makeItem({ id: 'd', genres: ['Documentary'] }),
      makeItem({ id: 'ds', mediaType: 'tv', genres: ['Documentary', 'Reality'] }),
      makeItem({ id: 'r', mediaType: 'tv', genres: ['Reality'] }),
    ];
    const ids = (kinds: typeof DEFAULT_FILTERS.kinds) =>
      applyFilters(items, { ...DEFAULT_FILTERS, kinds }).map(r => r.title.id);
    expect(ids(['movie'])).toEqual(['m']);
    expect(ids(['series', 'docuseries'])).toEqual(['s', 'ds']);
    expect(ids(['documentary'])).toEqual(['d']);
    expect(ids(['unscripted'])).toEqual(['r']);
    expect(ids([])).toHaveLength(5);
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
