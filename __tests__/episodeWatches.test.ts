jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  getWatchedEpisodes,
  setEpisodesWatched,
} from '../src/db/repositories/episodeWatchesRepo';

describe('episode watches', () => {
  it('marks, dedupes and unmarks per title', async () => {
    await setEpisodesWatched(
      'tv:1',
      [
        { season: 1, episode: 1 },
        { season: 1, episode: 2 },
        { season: 2, episode: 1 },
      ],
      true,
    );
    await setEpisodesWatched('tv:1', [{ season: 1, episode: 1 }], true);
    await setEpisodesWatched('tv:2', [{ season: 1, episode: 1 }], true);
    expect([...(await getWatchedEpisodes('tv:1'))].sort()).toEqual([
      '1:1',
      '1:2',
      '2:1',
    ]);

    await setEpisodesWatched(
      'tv:1',
      [
        { season: 1, episode: 2 },
        { season: 2, episode: 1 },
      ],
      false,
    );
    expect([...(await getWatchedEpisodes('tv:1'))]).toEqual(['1:1']);
    expect([...(await getWatchedEpisodes('tv:2'))]).toEqual(['1:1']);
  });
});
