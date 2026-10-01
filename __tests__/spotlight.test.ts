jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import { planSync, spotlightItem } from '../src/search/spotlight';

const severance = {
  id: 'tv:95396',
  title: 'Severance',
  genres: ['Drama', 'Mystery'],
  castNames: ['Adam Scott', 'Britt Lower'],
  releaseDate: '2022-02-17',
  mediaType: 'tv',
  primaryRatingScore: 84,
};

describe('spotlightItem', () => {
  it('describes a title and ranks library titles higher', () => {
    const item = spotlightItem(severance, true);
    expect(item).toMatchObject({
      id: 'tv:95396',
      domain: 'library',
      title: 'Severance',
      rankingHint: 2,
    });
    expect(item.description).toContain('2022');
    expect(item.keywords).toEqual(expect.arrayContaining(['Adam Scott', 'Drama', '2022']));
    expect(spotlightItem(severance, false)).toMatchObject({ domain: 'catalog', rankingHint: 1 });
  });
});

describe('planSync', () => {
  it('sends only new or changed items and removes vanished ones', () => {
    const a = spotlightItem(severance, false);
    const b = spotlightItem({ ...severance, id: 'movie:1', title: 'Arrival' }, false);
    const first = planSync([a, b], {});
    expect(first.index.map(i => i.id)).toEqual(['tv:95396', 'movie:1']);

    const same = planSync([a, b], first.next);
    expect(same.index).toEqual([]);
    expect(same.remove).toEqual([]);

    const changed = planSync([spotlightItem(severance, true)], first.next);
    expect(changed.index.map(i => i.id)).toEqual(['tv:95396']);
    expect(changed.remove).toEqual(['movie:1']);
  });
});
