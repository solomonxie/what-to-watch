import { INIT_STATEMENTS } from './0000_init';
import { TITLE_FACETS_STATEMENTS } from './0001_title_facets';
import { PROVIDER_LINKS_STATEMENTS } from './0002_provider_links';
import { CERTIFICATION_STATEMENTS } from './0003_certification';
import { EPISODE_WATCHES_STATEMENTS } from './0004_episode_watches';
import { DERIVED_STATUS_STATEMENTS } from './0005_derived_status';
import { RESPONSE_CACHE_STATEMENTS } from './0006_response_cache';
import { NOTE_MARKS_STATEMENTS } from './0007_note_marks';
import { MERGE_DUPLICATES_STATEMENTS } from './0008_merge_duplicates';
import { POPULARITY_STATEMENTS } from './0009_popularity';
import { RATED_MARKS_STATEMENTS } from './0010_rated_marks';
import { MARKS_STATEMENTS } from './0011_marks';

// Index + 1 = the PRAGMA user_version after that step runs.
export const MIGRATIONS: string[][] = [
  INIT_STATEMENTS,
  TITLE_FACETS_STATEMENTS,
  PROVIDER_LINKS_STATEMENTS,
  CERTIFICATION_STATEMENTS,
  EPISODE_WATCHES_STATEMENTS,
  DERIVED_STATUS_STATEMENTS,
  RESPONSE_CACHE_STATEMENTS,
  NOTE_MARKS_STATEMENTS,
  MERGE_DUPLICATES_STATEMENTS,
  POPULARITY_STATEMENTS,
  RATED_MARKS_STATEMENTS,
  MARKS_STATEMENTS,
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
