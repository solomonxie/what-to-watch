import { open, type DB } from '@op-engineering/op-sqlite';
import { drizzle, type OPSQLiteDatabase } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';
import { runMigrations } from './migrations';
import { isDemo } from '../demo/demoMode';

type Schema = typeof schema;

let rawDbInstance: DB | null = null;
let ormInstance: OPSQLiteDatabase<Schema> | null = null;

// Opening the native SQLite connection is deferred until first actual use
// (inside ensureMigrated/a repository call) rather than at module load, so
// importing this file never triggers a native call during JS bundle
// evaluation/app startup.
export function getRawDb(): DB {
  if (!rawDbInstance) {
    // Demo mode gets its own file; the real one is never opened meanwhile.
    rawDbInstance = open({
      name: isDemo() ? 'whattowatch-demo.db' : 'whattowatch.db',
    });
  }
  return rawDbInstance;
}

/** Drops the connection, so the next query opens the current mode's file. */
export function closeDatabase(options: { deleteFile?: boolean } = {}): void {
  if (options.deleteFile) getRawDb().delete();
  else rawDbInstance?.close();
  rawDbInstance = null;
  ormInstance = null;
  migration = null;
}

type Params = Parameters<DB['execute']>[1];

// drizzle-orm's op-sqlite driver targets the pre-v15 op-sqlite API
// (executeAsync / executeRawAsync / sync execute with rows._array).
function drizzleClient(raw: DB) {
  return {
    executeAsync: (query: string, params?: Params) =>
      raw.execute(query, params),
    executeRawAsync: (query: string, params?: Params) =>
      raw.executeRaw(query, params).then(r => r.rawRows),
    execute: (query: string, params?: Params) => ({
      rows: { _array: raw.executeSync(query, params).rows },
    }),
  };
}

function getOrm(): OPSQLiteDatabase<Schema> {
  if (!ormInstance) {
    ormInstance = drizzle(drizzleClient(getRawDb()) as unknown as DB, {
      schema,
    });
  }
  return ormInstance;
}

export const db: OPSQLiteDatabase<Schema> = new Proxy(
  {} as OPSQLiteDatabase<Schema>,
  {
    get(_target, prop) {
      const orm = getOrm();
      const value = Reflect.get(orm as object, prop);
      return typeof value === 'function' ? value.bind(orm) : value;
    },
  },
);

let migration: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!migration) {
    migration = runMigrations(getRawDb()).catch(error => {
      migration = null;
      throw error;
    });
  }
  return migration;
}

// drizzle's op-sqlite transaction() is synchronous and commits before async
// callbacks finish, so transactions are driven here instead.
export async function withTransaction(fn: () => Promise<void>): Promise<void> {
  await ensureMigrated();
  const raw = getRawDb();
  await raw.execute('BEGIN');
  try {
    await fn();
    await raw.execute('COMMIT');
  } catch (error) {
    await raw.execute('ROLLBACK');
    throw error;
  }
}
