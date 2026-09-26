import type {
  cachedTitles,
  settings,
  userNotes,
  userRatings,
  watchHistory,
} from '../db/schema';

export const PAYLOAD_VERSION = 2;
export const BACKUP_SUFFIX = '-what-to-watch.json';
export const LOCAL_DAILY_NAME = 'what-to-watch-daily.json';
export const LOCAL_PREFIX = 'what-to-watch-';
export const LOCAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type NoId<T> = Omit<T, 'id'> & { id?: unknown };

export interface BackupPayload {
  version: number;
  exportedAt: string;
  notes: NoId<typeof userNotes.$inferInsert>[];
  ratings: NoId<typeof userRatings.$inferInsert>[];
  watchHistory: NoId<typeof watchHistory.$inferInsert>[];
  settings?: NoId<typeof settings.$inferInsert>;
  titles?: (typeof cachedTitles.$inferInsert)[];
  /** Taste profile (JSON of Preferences). */
  preferences?: unknown;
}

export class BackupVersionError extends Error {}

export function parsePayload(text: string): BackupPayload {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || typeof data.version !== 'number') {
    throw new Error('Not a What to Watch backup file');
  }
  if (data.version > PAYLOAD_VERSION) {
    throw new BackupVersionError(
      `This backup is from a newer version of the app (v${data.version}). Update the app first.`,
    );
  }
  return {
    version: data.version,
    exportedAt: data.exportedAt ?? '',
    notes: data.notes ?? [],
    ratings: data.ratings ?? [],
    watchHistory: data.watchHistory ?? [],
    settings: data.settings ?? undefined,
    titles: data.titles ?? [],
    preferences: data.preferences ?? undefined,
  };
}

export function stripId<T extends { id?: unknown }>(row: T): Omit<T, 'id'> {
  const rest: Partial<T> = { ...row };
  delete rest.id;
  return rest as Omit<T, 'id'>;
}

// Hash of the content only, so an unchanged dataset gates as unchanged.
export function contentHash(payload: BackupPayload): string {
  return fnv1a(JSON.stringify({ ...payload, exportedAt: undefined }));
}

/* eslint-disable no-bitwise */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
/* eslint-enable no-bitwise */

export function datedFileName(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}${BACKUP_SUFFIX}`;
}

export function beforeImportFileName(date: Date): string {
  return `${LOCAL_PREFIX}before-import-${date.getTime()}.json`;
}

export function selectExpired(
  files: Array<{ name: string; mtimeMs: number }>,
  now: number,
  maxAgeMs = LOCAL_MAX_AGE_MS,
): string[] {
  return files
    .filter(f => f.name.startsWith(LOCAL_PREFIX) && f.name.endsWith('.json'))
    .filter(f => now - f.mtimeMs > maxAgeMs)
    .map(f => f.name);
}

export function shouldWrite(hash: string, lastHash: string | null): boolean {
  return hash !== lastHash;
}

export function hasUserData(
  p: Pick<BackupPayload, 'notes' | 'ratings' | 'watchHistory'>,
) {
  return p.notes.length + p.ratings.length + p.watchHistory.length > 0;
}
