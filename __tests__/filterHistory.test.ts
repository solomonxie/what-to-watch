jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  describeFilters,
  getFilterHistory,
  MAX_FILTER_HISTORY,
  saveFilterHistory,
  withEntry,
} from '../src/state/filterHistory';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../src/state/filterStore';

const entry = (patch: object, sort = DEFAULT_SORT) => ({
  filters: { ...DEFAULT_FILTERS, ...patch },
  sort,
});

describe('filter history', () => {
  it('describes filters on one line', () => {
    expect(
      describeFilters(
        entry({
          kinds: ['series'],
          ratingRange: [70, 100],
          ages: ['adults'],
          genres: ['Thriller'],
          languages: ['en'],
          yearRange: [2010, 2019],
        }),
      ),
    ).toBe('Series · 2010s · ★ 7+ · Adults 17+ · Thriller · English');
    expect(
      describeFilters(entry({}, { key: 'rating', direction: 'desc' })),
    ).toBe('by rating');
  });

  it('skips defaults and moves repeats to the top', () => {
    const a = entry({ genres: ['Drama'] });
    const b = entry({ genres: ['Comedy'] });
    expect(withEntry([], entry({ cast: [' '] }))).toEqual([]);
    expect(withEntry(withEntry([a], b), a)).toEqual([a, b]);
  });

  it('keeps a bounded list', () => {
    let h: ReturnType<typeof withEntry> = [];
    for (let i = 0; i < MAX_FILTER_HISTORY + 3; i++)
      h = withEntry(h, entry({ cast: [`actor ${i}`] }));
    expect(h).toHaveLength(MAX_FILTER_HISTORY);
  });

  it('persists', async () => {
    const h = [entry({ genres: ['Drama'] })];
    await saveFilterHistory(h);
    expect(await getFilterHistory()).toEqual(h);
  });
});
