jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import { addMark } from '../src/db/repositories/marksRepo';
import {
  getWatchEntry,
  markFinished,
  setInterested,
  syncShowProgress,
} from '../src/db/repositories/watchHistoryRepo';

const rate = (id: string, rating: number) =>
  addMark(id, { rating, markedAt: Date.now() });
const status = async (id: string) => (await getWatchEntry(id))?.status;

describe('derived watch status', () => {
  it('toggles interest only before watching starts', async () => {
    await setInterested('tv:1', true);
    expect(await status('tv:1')).toBe('toWatch');
    await setInterested('tv:1', false);
    expect(await status('tv:1')).toBeUndefined();
  });

  it('follows episode progress', async () => {
    await setInterested('tv:2', true);
    await syncShowProgress('tv:2', 3, 10);
    expect(await status('tv:2')).toBe('watching');
    await setInterested('tv:2', false);
    expect(await status('tv:2')).toBe('watching');
    await syncShowProgress('tv:2', 10, 10);
    expect(await status('tv:2')).toBe('completed');
    await syncShowProgress('tv:2', 0, 10);
    expect(await status('tv:2')).toBe('toWatch');
  });

  it('ignores unmarking on a title never tracked', async () => {
    await syncShowProgress('tv:3', 0, 10);
    expect(await status('tv:3')).toBeUndefined();
  });

  it('finishes a movie once, keeping the viewing count', async () => {
    await markFinished('movie:1');
    await markFinished('movie:1');
    const entry = await getWatchEntry('movie:1');
    expect(entry?.status).toBe('completed');
    expect(entry?.rewatchCount).toBe(1);
  });
});

describe('low scores and movies', () => {
  it('drops an unfinished show scored low, and resumes when raised', async () => {
    await syncShowProgress('tv:10', 2, 10);
    await rate('tv:10', 3);
    expect(await status('tv:10')).toBe('dropped');
    await syncShowProgress('tv:10', 3, 10);
    expect(await status('tv:10')).toBe('dropped');
    await new Promise<void>(r => setTimeout(r, 2));
    await rate('tv:10', 7);
    expect(await status('tv:10')).toBe('watching');
  });

  it('a finished show stays completed even when scored low', async () => {
    await syncShowProgress('tv:11', 10, 10);
    await rate('tv:11', 2);
    expect(await status('tv:11')).toBe('completed');
  });

  it('reconcile writes only a changed status', async () => {
    await syncShowProgress('tv:12', 2, 10);
    const before = (await getWatchEntry('tv:12'))!.watchedAt;
    await new Promise<void>(r => setTimeout(r, 5));
    await syncShowProgress('tv:12', 2, 10, { touch: false });
    expect((await getWatchEntry('tv:12'))!.watchedAt).toBe(before);
  });
});

describe('derived status (imports ignore the source label)', () => {
  const { derivedStatus } = require('../src/libraryImport/status');
  const d = (o: object) =>
    derivedStatus({ rated: false, episodesWatched: 0, ...o });

  it('movie: rated → watched, otherwise to watch', () => {
    expect(d({ mediaType: 'movie', source: 'completed' })).toBe('toWatch');
    expect(d({ mediaType: 'movie', source: 'watching' })).toBe('toWatch');
    expect(d({ mediaType: 'movie', source: 'toWatch', rated: true })).toBe(
      'completed',
    );
  });

  it('series: source watched, or finished here → watched', () => {
    expect(d({ mediaType: 'tv', source: 'completed' })).toBe('completed');
    expect(
      d({ mediaType: 'tv', source: 'toWatch', current: 'completed' }),
    ).toBe('completed');
  });

  it('series: otherwise episodes decide; "watching" alone means to watch', () => {
    expect(d({ mediaType: 'tv', source: 'watching' })).toBe('toWatch');
    expect(d({ mediaType: 'tv', source: 'watching', rated: true })).toBe(
      'toWatch',
    );
    expect(d({ mediaType: 'tv', source: 'toWatch', episodesWatched: 3 })).toBe(
      'watching',
    );
  });
});
