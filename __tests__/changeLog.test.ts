import { diffStates, logState, toJsonl } from '../src/backup/changeLog';
import type { BackupPayload } from '../src/backup/payload';

const payload = (over: Partial<BackupPayload> = {}): BackupPayload => ({
  version: 2,
  exportedAt: '',
  notes: [],
  ratings: [],
  watchHistory: [],
  episodes: [],
  ...over,
});

const at = new Date('2026-09-27T10:00:00Z');

describe('change log', () => {
  it('logs nothing for identical data', () => {
    const s = logState(payload());
    expect(diffStates(s, s, at)).toEqual([]);
  });

  it('logs adds, changed fields only, and removals', () => {
    const before = logState(
      payload({
        ratings: [
          { titleId: 'movie:1', rating: 6, createdAt: 1, updatedAt: 1 },
          { titleId: 'movie:2', rating: 8, createdAt: 1, updatedAt: 1 },
        ],
        watchHistory: [
          {
            titleId: 'tv:3',
            status: 'watching',
            watchedAt: 5,
            rewatchCount: 0,
          },
        ],
      }),
    );
    const after = logState(
      payload({
        ratings: [
          { titleId: 'movie:1', rating: 7, createdAt: 1, updatedAt: 9 },
        ],
        watchHistory: [
          {
            titleId: 'tv:3',
            status: 'watching',
            watchedAt: 5,
            rewatchCount: 0,
          },
        ],
        episodes: [{ titleId: 'tv:3', season: 1, episode: 2, watchedAt: 9 }],
      }),
    );
    const entries = diffStates(before, after, at, { 'movie:1': 'Dune' });
    expect(entries).toEqual([
      {
        at: at.toISOString(),
        kind: 'ratings',
        key: 'movie:1',
        title: 'Dune',
        op: 'change',
        before: { rating: 6 },
        after: { rating: 7 },
      },
      {
        at: at.toISOString(),
        kind: 'ratings',
        key: 'movie:2',
        op: 'remove',
        before: { rating: 8, reviewText: null },
      },
      {
        at: at.toISOString(),
        kind: 'episodes',
        key: 'tv:3/S1E2',
        op: 'add',
        after: { watchedAt: 9 },
      },
    ]);
  });

  it('writes one JSON object per line', () => {
    const entries = diffStates(
      logState(payload()),
      logState(payload({ settings: { defaultRegion: 'CA' } as never })),
      at,
    );
    const lines = toJsonl(entries).trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).kind).toBe('settings');
  });
});
