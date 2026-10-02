jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  addMark,
  deleteMark,
  getNotesForTitle,
  importMark,
  updateMark,
} from '../src/db/repositories/notesRepo';
import { getUserRatingForTitle } from '../src/db/repositories/ratingsRepo';

describe('watch marks', () => {
  it("lists newest first and the title's rating is the latest mark's", async () => {
    await addMark('tv:1', { rating: 6, body: 'pilot', markedAt: 1000 });
    await addMark('tv:1', { rating: 9, body: '', markedAt: 3000 });
    let marks = await getNotesForTitle('tv:1');
    expect(marks.map(m => [m.markedAt, m.rating])).toEqual([
      [3000, 9],
      [1000, 6],
    ]);
    expect((await getUserRatingForTitle('tv:1'))?.rating).toBe(9);

    await updateMark(marks[1].id, { rating: 7, body: 'again', markedAt: 5000 });
    expect((await getUserRatingForTitle('tv:1'))?.rating).toBe(7);

    marks = await getNotesForTitle('tv:1');
    await deleteMark(marks[0].id);
    expect((await getUserRatingForTitle('tv:1'))?.rating).toBe(9);
    await deleteMark(marks[1].id);
    expect(await getUserRatingForTitle('tv:1')).toBeUndefined();
  });

  it('imports once and names the season on a merged mark', async () => {
    await addMark('tv:3', { rating: 8, body: 'tense', markedAt: 500 });
    const season = { rating: 8, body: 'Season 2 · tense', markedAt: 500 };
    expect(await importMark('tv:3', season, 'tense')).toBe(false);
    expect(await importMark('tv:3', season, 'tense')).toBe(false);
    expect((await getNotesForTitle('tv:3')).map(m => m.body)).toEqual([
      'Season 2 · tense',
    ]);
    expect(
      await importMark('tv:3', { rating: 6, body: '', markedAt: 900 }, ''),
    ).toBe(true);
    expect((await getUserRatingForTitle('tv:3'))?.rating).toBe(6);
  });
});
