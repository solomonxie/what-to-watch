import { MIGRATIONS, runMigrations, type MigrationDb } from '../src/db/migrations';

function fakeDb(initialVersion: number, hasSettings: boolean) {
  const executed: string[] = [];
  let version = initialVersion;
  const db: MigrationDb = {
    async execute(sql) {
      executed.push(sql);
      if (sql === 'PRAGMA user_version') return { rows: [{ user_version: version }] };
      const set = sql.match(/^PRAGMA user_version = (\d+)$/);
      if (set) version = Number(set[1]);
      if (sql.includes('sqlite_master')) return { rows: hasSettings ? [{ name: 'settings' }] : [] };
      return { rows: [] };
    },
  };
  return { db, executed, version: () => version };
}

describe('runMigrations', () => {
  it('runs every step on a fresh database', async () => {
    const f = fakeDb(0, false);
    await runMigrations(f.db);
    expect(f.version()).toBe(MIGRATIONS.length);
    expect(f.executed.some(s => s.startsWith('CREATE TABLE settings'))).toBe(true);
  });

  it('treats an unversioned existing database as version 1', async () => {
    const f = fakeDb(0, true);
    await runMigrations(f.db);
    expect(f.executed.some(s => s.startsWith('CREATE TABLE settings'))).toBe(false);
    expect(f.executed).toContain('ALTER TABLE cached_titles ADD COLUMN cast_names TEXT');
    expect(f.version()).toBe(MIGRATIONS.length);
  });

  it('does nothing when already current', async () => {
    const f = fakeDb(MIGRATIONS.length, true);
    await runMigrations(f.db);
    expect(f.executed).toEqual(['PRAGMA user_version']);
  });
});
