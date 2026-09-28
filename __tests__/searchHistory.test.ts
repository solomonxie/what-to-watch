jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  getSearchHistory,
  MAX_SEARCH_HISTORY,
  saveSearchHistory,
  withQuery,
} from '../src/search/searchHistory';

describe('search history', () => {
  it('puts the newest first and moves repeats to the top', () => {
    expect(withQuery(['dune', 'Severance'], ' severance ')).toEqual([
      'severance',
      'dune',
    ]);
    expect(withQuery(['dune'], '  ')).toEqual(['dune']);
  });

  it('keeps a bounded list', () => {
    let h: string[] = [];
    for (let i = 0; i < MAX_SEARCH_HISTORY + 5; i++) h = withQuery(h, `q${i}`);
    expect(h).toHaveLength(MAX_SEARCH_HISTORY);
    expect(h[0]).toBe(`q${MAX_SEARCH_HISTORY + 4}`);
  });

  it('persists', async () => {
    expect(await getSearchHistory()).toEqual([]);
    await saveSearchHistory(['dune']);
    expect(await getSearchHistory()).toEqual(['dune']);
  });
});
