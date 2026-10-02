jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  addMark,
  deleteMark,
  getMarksForTitle,
  importMark,
  updateMark,
} from '../src/db/repositories/marksRepo';
import { getUserRatingForTitle } from '../src/db/repositories/ratingsRepo';
import {
  getWatchedEpisodes,
  setEpisodesWatched,
} from '../src/db/repositories/episodeWatchesRepo';
import { seasonRatings } from '../src/marks/derive';

describe('watch marks', () => {
  it('rates a title by its latest title-level mark', async () => {
    await addMark('tv:1', { rating: 6, review: 'pilot', markedAt: 1000 });
    await addMark('tv:1', { rating: 9, markedAt: 3000 });
    await addMark('tv:1', { season: 2, rating: 4, markedAt: 4000 });
    let marks = await getMarksForTitle('tv:1');
    expect(marks.map(m => [m.markedAt, m.rating])).toEqual([
      [4000, 4],
      [3000, 9],
      [1000, 6],
    ]);
    expect((await getUserRatingForTitle('tv:1'))?.rating).toBe(9);
    expect(seasonRatings(marks)).toEqual([{ season: 2, rating: 4 }]);

    await updateMark(marks[2].id!, { rating: 7, markedAt: 5000 });
    expect((await getUserRatingForTitle('tv:1'))?.rating).toBe(7);

    marks = await getMarksForTitle('tv:1');
    await deleteMark(marks.find(m => m.rating === 7)!.id!);
    await deleteMark(marks.find(m => m.rating === 9)!.id!);
    expect(await getUserRatingForTitle('tv:1')).toBeUndefined();
  });

  it('keeps the latest rated score when a newer mark has none', async () => {
    await addMark('movie:4', { rating: 7, markedAt: 100 });
    await addMark('movie:4', { review: 'rewatched', markedAt: 200 });
    expect((await getUserRatingForTitle('movie:4'))?.rating).toBe(7);
  });

  it('ticks episodes as marks; unticking keeps a written one', async () => {
    const ep = { season: 1, episode: 2 };
    await setEpisodesWatched('tv:5', [ep, { season: 1, episode: 3 }], true);
    await setEpisodesWatched('tv:5', [ep], true);
    expect(await getWatchedEpisodes('tv:5')).toEqual(new Set(['1:2', '1:3']));
    const tick = (await getMarksForTitle('tv:5')).find(m => m.episode === 3)!;
    await updateMark(tick.id!, {
      ...ep,
      episode: 3,
      status: 'watched',
      review: 'great',
      markedAt: tick.markedAt,
    });
    await setEpisodesWatched('tv:5', [ep, { season: 1, episode: 3 }], false);
    expect(await getWatchedEpisodes('tv:5')).toEqual(new Set());
    expect((await getMarksForTitle('tv:5')).map(m => m.review)).toEqual([
      'great',
    ]);
  });

  it('imports once and moves a merged mark onto its season', async () => {
    await addMark('tv:3', { rating: 8, review: 'tense', markedAt: 500 });
    const season = {
      rating: 8,
      review: 'tense',
      season: 2,
      status: 'watched' as const,
      markedAt: 500,
    };
    expect(await importMark('tv:3', season)).toBe(false);
    expect(await importMark('tv:3', season)).toBe(false);
    expect(
      (await getMarksForTitle('tv:3')).map(m => [m.season, m.status, m.review]),
    ).toEqual([[2, 'watched', 'tense']]);
    expect(await importMark('tv:3', { rating: 6, markedAt: 900 })).toBe(true);
    expect((await getUserRatingForTitle('tv:3'))?.rating).toBe(6);
  });
});
