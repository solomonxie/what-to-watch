import { diffStates, logState, toJsonl } from '../src/backup/changeLog';
import type { BackupPayload } from '../src/backup/payload';

const payload = (over: Partial<BackupPayload> = {}): BackupPayload => ({
  version: 3,
  exportedAt: '',
  marks: [],
  ...over,
});

const mark = (o: object) => ({
  titleId: 'movie:1',
  season: null,
  episode: null,
  status: null,
  rating: null,
  review: '',
  markedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  ...o,
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
        marks: [mark({ rating: 6 }), mark({ titleId: 'movie:2', rating: 8 })],
      }),
    );
    const after = logState(
      payload({
        marks: [
          mark({ rating: 7, updatedAt: 9 }),
          mark({
            titleId: 'tv:3',
            season: 1,
            episode: 2,
            status: 'watched',
            markedAt: 9,
            createdAt: 9,
          }),
        ],
      }),
    );
    const entries = diffStates(before, after, at, { 'movie:1': 'Dune' });
    expect(entries).toEqual([
      {
        at: at.toISOString(),
        kind: 'marks',
        key: 'movie:1@1/:',
        title: 'Dune',
        op: 'change',
        before: { rating: 6 },
        after: { rating: 7 },
      },
      {
        at: at.toISOString(),
        kind: 'marks',
        key: 'movie:2@1/:',
        op: 'remove',
        before: { status: null, rating: 8, review: '', markedAt: 1 },
      },
      {
        at: at.toISOString(),
        kind: 'marks',
        key: 'tv:3@9/1:2',
        op: 'add',
        after: { status: 'watched', rating: null, review: '', markedAt: 9 },
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
