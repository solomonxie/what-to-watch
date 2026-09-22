import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';
import { INIT_STATEMENTS } from './migrations/0000_init';

const rawDb = open({ name: 'whattowatch.db' });

export const db = drizzle(rawDb, { schema });

let migrated = false;

export async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  const hasTables = await rawDb.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'",
  );
  if (!hasTables.rows || hasTables.rows.length === 0) {
    for (const statement of INIT_STATEMENTS) {
      await rawDb.execute(statement);
    }
  }
  migrated = true;
}
