import {
  BackupVersionError,
  PAYLOAD_VERSION,
  beforeImportFileName,
  contentHash,
  datedFileName,
  parsePayload,
  selectExpired,
  shouldWrite,
  type BackupPayload,
} from '../src/backup/payload';

const DAY = 24 * 60 * 60 * 1000;

function payload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: PAYLOAD_VERSION,
    exportedAt: '2026-09-25T00:00:00.000Z',
    notes: [],
    ratings: [],
    watchHistory: [],
    titles: [],
    ...overrides,
  };
}

describe('parsePayload', () => {
  it('accepts v1 exports without titles', () => {
    const v1 = {
      version: 1,
      exportedAt: 'x',
      notes: [],
      ratings: [],
      watchHistory: [],
    };
    expect(parsePayload(JSON.stringify(v1)).titles).toEqual([]);
  });

  it('refuses a newer version', () => {
    const next = JSON.stringify({ version: PAYLOAD_VERSION + 1 });
    expect(() => parsePayload(next)).toThrow(BackupVersionError);
  });

  it('rejects non-backup JSON', () => {
    expect(() => parsePayload('{"foo":1}')).toThrow(
      'Not a What to Watch backup file',
    );
  });

  it('ignores legacy apiKeys in v1 files', () => {
    const v1 = {
      version: 1,
      notes: [],
      ratings: [],
      watchHistory: [],
      apiKeys: { tmdb: 'k' },
    };
    expect(parsePayload(JSON.stringify(v1))).not.toHaveProperty('apiKeys');
  });
});

describe('hash gate', () => {
  it('ignores exportedAt', () => {
    const a = contentHash(payload({ exportedAt: 'a' }));
    const b = contentHash(payload({ exportedAt: 'b' }));
    expect(a).toBe(b);
    expect(shouldWrite(a, b)).toBe(false);
  });

  it('changes when content changes', () => {
    const a = contentHash(payload());
    const b = contentHash(
      payload({
        notes: [{ titleId: '1', body: 'hi', createdAt: 1, updatedAt: 1 }],
      }),
    );
    expect(shouldWrite(b, a)).toBe(true);
    expect(shouldWrite(a, null)).toBe(true);
  });
});

describe('selectExpired', () => {
  const now = 100 * DAY;
  it('prunes only our files older than 7 days', () => {
    const files = [
      { name: 'what-to-watch-daily.json', mtimeMs: now - DAY },
      { name: 'what-to-watch-before-import-1.json', mtimeMs: now - 8 * DAY },
      { name: 'other.json', mtimeMs: now - 30 * DAY },
    ];
    expect(selectExpired(files, now)).toEqual([
      'what-to-watch-before-import-1.json',
    ]);
  });
});

describe('file names', () => {
  it('dates iCloud files so the folder sorts itself', () => {
    expect(datedFileName(new Date(2026, 8, 5))).toBe(
      '20260905-what-to-watch.json',
    );
  });
  it('names before-import snapshots apart from the daily file', () => {
    expect(beforeImportFileName(new Date(0))).toBe(
      'what-to-watch-before-import-0.json',
    );
  });
});

describe('snapshots and zips', () => {
  const {
    base64ToBytes,
    bytesToBase64,
    payloadFromBytes,
    payloadStats,
    selectExpiredSnapshots,
    snapshotName,
    zipPayload,
  } = require('../src/backup/payload');

  it('names one snapshot per day', () => {
    expect(snapshotName(new Date(2026, 8, 26, 9, 5, 7, 42))).toBe(
      '20260926.json',
    );
  });

  it('keeps one per day for 7 days, dropping older per-change names', () => {
    const today = snapshotName(new Date(2026, 8, 26, 10));
    const oldStyle = '20260926-100000-000.json';
    const weekAgo = snapshotName(new Date(2026, 8, 20, 10));
    const tooOld = snapshotName(new Date(2026, 8, 19, 10));
    const expired = selectExpiredSnapshots(
      [today, oldStyle, weekAgo, tooOld, 'notes.txt'],
      new Date(2026, 8, 26, 12),
    );
    expect(expired.sort()).toEqual([tooOld, oldStyle].sort());
  });

  it('round-trips a payload through zip and base64, and still reads JSON', () => {
    const payload = {
      version: 2,
      exportedAt: 'x',
      notes: [],
      ratings: [{ titleId: 'movie:1', rating: 8, createdAt: 1, updatedAt: 1 }],
      watchHistory: [
        { titleId: 'tv:1', status: 'watching', watchedAt: 1, rewatchCount: 0 },
        {
          titleId: 'movie:1',
          status: 'completed',
          watchedAt: 1,
          rewatchCount: 1,
        },
      ],
      episodes: [{ titleId: 'tv:1', season: 1, episode: 1, watchedAt: 1 }],
      titles: [],
    };
    const back = payloadFromBytes(
      base64ToBytes(bytesToBase64(zipPayload(payload))),
    );
    expect(back.ratings).toEqual(payload.ratings);
    expect(payloadStats(back)).toEqual({
      watching: 1,
      watched: 1,
      toWatch: 0,
      rated: 1,
      episodes: 1,
      notes: 0,
    });
    const json = require('fflate').strToU8(JSON.stringify(payload));
    expect(payloadFromBytes(json).watchHistory).toHaveLength(2);
  });
});

describe('iCloud safety rules', () => {
  const {
    iCloudFileName,
    selectExpiredICloud,
    userRecordCount,
  } = require('../src/backup/payload');
  const now = new Date(2026, 8, 26, 14, 30, 5);

  it("refreshes today's file unless the new backup is much smaller", () => {
    expect(iCloudFileName(now, null, 100)).toBe('20260926-what-to-watch.zip');
    expect(iCloudFileName(now, 1000, 950)).toBe('20260926-what-to-watch.zip');
    expect(iCloudFileName(now, 1000, 1500)).toBe('20260926-what-to-watch.zip');
    expect(iCloudFileName(now, 1000, 100)).toBe(
      '20260926-143005-what-to-watch.zip',
    );
  });

  it('keeps 30 days of files plus one per month for 12 months', () => {
    const days = Array.from({ length: 400 }, (_, i) => {
      const d = new Date(2026, 8, 26 - i);
      const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}${String(d.getDate()).padStart(2, '0')}`;
      return `${key}-what-to-watch.zip`;
    });
    const burst = [
      '20260926-101010-what-to-watch.zip',
      '20260926-111111-what-to-watch.zip',
    ];
    const expired = selectExpiredICloud([...days, ...burst]);
    const kept = [...days, ...burst].filter(n => !expired.includes(n));
    // A same-day burst doesn't use up days.
    expect(kept.filter(n => n.startsWith('202609'))).toContain(days[25]);
    expect(new Set(kept.map(n => n.slice(0, 8))).size).toBe(30 + 12);
    expect(kept).toEqual(expect.arrayContaining(burst));
    expect(kept.some(n => n.startsWith('2025'))).toBe(true);
    expect(expired).toContain(days[399]);
  });

  it('counts only what the user made', () => {
    expect(
      userRecordCount({
        notes: [{}],
        ratings: [{}, {}],
        watchHistory: [{}],
        episodes: [{}, {}, {}],
      }),
    ).toBe(7);
    expect(userRecordCount({ notes: [], ratings: [], watchHistory: [] })).toBe(
      0,
    );
  });
});
