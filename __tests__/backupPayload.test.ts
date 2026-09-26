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
    const v1 = { version: 1, exportedAt: 'x', notes: [], ratings: [], watchHistory: [] };
    expect(parsePayload(JSON.stringify(v1)).titles).toEqual([]);
  });

  it('refuses a newer version', () => {
    const next = JSON.stringify({ version: PAYLOAD_VERSION + 1 });
    expect(() => parsePayload(next)).toThrow(BackupVersionError);
  });

  it('rejects non-backup JSON', () => {
    expect(() => parsePayload('{"foo":1}')).toThrow('Not a What to Watch backup file');
  });

  it('ignores legacy apiKeys in v1 files', () => {
    const v1 = { version: 1, notes: [], ratings: [], watchHistory: [], apiKeys: { tmdb: 'k' } };
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
      payload({ notes: [{ titleId: '1', body: 'hi', createdAt: 1, updatedAt: 1 }] }),
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
    expect(selectExpired(files, now)).toEqual(['what-to-watch-before-import-1.json']);
  });
});

describe('file names', () => {
  it('dates iCloud files so the folder sorts itself', () => {
    expect(datedFileName(new Date(2026, 8, 5))).toBe('20260905-what-to-watch.json');
  });
  it('names before-import snapshots apart from the daily file', () => {
    expect(beforeImportFileName(new Date(0))).toBe('what-to-watch-before-import-0.json');
  });
});
