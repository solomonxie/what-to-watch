import { INIT_STATEMENTS } from './0000_init';
import { TITLE_FACETS_STATEMENTS } from './0001_title_facets';
import { PROVIDER_LINKS_STATEMENTS } from './0002_provider_links';

// Index + 1 = the PRAGMA user_version after that step runs.
export const MIGRATIONS: string[][] = [
  INIT_STATEMENTS,
  TITLE_FACETS_STATEMENTS,
  PROVIDER_LINKS_STATEMENTS,
];

export interface MigrationDb {
  execute(sql: string): Promise<{ rows?: Array<Record<string, unknown>> }>;
}

async function tableExists(db: MigrationDb, name: string): Promise<boolean> {
  const res = await db.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`,
  );
  return (res.rows?.length ?? 0) > 0;
}

export async function runMigrations(db: MigrationDb): Promise<void> {
  const res = await db.execute('PRAGMA user_version');
  let version = Number(res.rows?.[0]?.user_version ?? 0);
  // DBs created before versioning have tables but user_version 0.
  if (version === 0 && (await tableExists(db, 'settings'))) version = 1;

  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.execute('BEGIN');
    try {
      for (const statement of MIGRATIONS[i]) await db.execute(statement);
      await db.execute(`PRAGMA user_version = ${i + 1}`);
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  }
}
