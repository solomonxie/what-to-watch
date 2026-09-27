import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type {
  cachedTitles,
  episodeWatches,
  settings,
  userNotes,
  userRatings,
  watchHistory,
} from '../db/schema';

export const PAYLOAD_VERSION = 2;
export const BACKUP_SUFFIX = '-what-to-watch.json';
export const ZIP_ENTRY = 'backup.json';
export const SNAPSHOT_DIR = 'Snapshots';
export const SNAPSHOTS_PER_DAY = 1;
export const SNAPSHOT_DAYS = 7;
export const LOCAL_PREFIX = 'what-to-watch-';
export const LOCAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type NoId<T> = Omit<T, 'id'> & { id?: unknown };

export interface BackupPayload {
  version: number;
  exportedAt: string;
  notes: NoId<typeof userNotes.$inferInsert>[];
  ratings: NoId<typeof userRatings.$inferInsert>[];
  watchHistory: NoId<typeof watchHistory.$inferInsert>[];
  /** Absent in backups made before episode tracking. */
  episodes?: NoId<typeof episodeWatches.$inferInsert>[];
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
    episodes: data.episodes ?? undefined,
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

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const dayKey = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** One iCloud file per day; later runs that day replace it. */
export function dailyZipName(date: Date): string {
  return `${dayKey(date)}-what-to-watch.zip`;
}

/** Everything the user made by hand; what a backup exists to keep. */
export function userRecordCount(
  p: Pick<BackupPayload, 'notes' | 'ratings' | 'watchHistory' | 'episodes'>,
): number {
  return (
    p.notes.length +
    p.ratings.length +
    p.watchHistory.length +
    (p.episodes?.length ?? 0)
  );
}

/** Below this share of today's copy, a write is treated as a possible loss. */
export const SHRINK_RATIO = 0.8;

/**
 * Today's file is refreshed in place, unless the new backup is much smaller
 * than the one already there — a wipe, a bad import, an old backup restored,
 * a fresh install. Then it goes to its own timestamped file so today's fuller
 * copy survives. Compared by zip size, read from the file itself, so it holds
 * even when this device remembers nothing (reinstall).
 */
export function iCloudFileName(
  now: Date,
  todaysSize: number | null,
  newSize: number,
): string {
  const shrinking = !!todaysSize && newSize < todaysSize * SHRINK_RATIO;
  if (!shrinking) return dailyZipName(now);
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds(),
  )}`;
  return `${dayKey(now)}-${time}-what-to-watch.zip`;
}

export const ICLOUD_DAYS = 30;
export const ICLOUD_MONTHS = 12;

/**
 * iCloud retention: every file from the newest 30 days that have one, plus
 * the newest file of each of the 12 newest months before that. Counting days,
 * not files, so a burst of writes can't push good days out.
 */
export function selectExpiredICloud(
  names: string[],
  days = ICLOUD_DAYS,
  months = ICLOUD_MONTHS,
): string[] {
  const dated = names
    .filter(n => /^\d{8}-/.test(n))
    .sort()
    .reverse();
  const keepDays = new Set(
    [...new Set(dated.map(n => n.slice(0, 8)))].slice(0, days),
  );
  const monthly = new Map<string, string>();
  for (const n of dated) {
    if (keepDays.has(n.slice(0, 8))) continue;
    const month = n.slice(0, 6);
    if (!monthly.has(month) && monthly.size < months) monthly.set(month, n);
  }
  const keep = new Set([
    ...dated.filter(n => keepDays.has(n.slice(0, 8))),
    ...monthly.values(),
  ]);
  return dated.filter(n => !keep.has(n));
}

/** One per day, replaced while the day lasts: 20260926.json */
export function snapshotName(date: Date): string {
  return `${dayKey(date)}.json`;
}

/**
 * Keeps the newest `perDay` snapshots of each of the last `days` days.
 * Also matches the older per-change names (20260926-095210-123.json).
 */
export function selectExpiredSnapshots(
  names: string[],
  now: Date,
  perDay = SNAPSHOTS_PER_DAY,
  days = SNAPSHOT_DAYS,
): string[] {
  const oldest = new Date(now);
  oldest.setDate(oldest.getDate() - (days - 1));
  const cutoff = dayKey(oldest);
  const byDay = new Map<string, string[]>();
  for (const name of names.filter(n =>
    /^\d{8}(-\d{6}-\d{3})?\.json$/.test(n),
  )) {
    const day = name.slice(0, 8);
    byDay.set(day, [...(byDay.get(day) ?? []), name]);
  }
  return [...byDay].flatMap(([day, list]) =>
    day < cutoff ? list : list.sort().reverse().slice(perDay),
  );
}

export function zipPayload(payload: BackupPayload): Uint8Array {
  return zipSync({ [ZIP_ENTRY]: strToU8(JSON.stringify(payload)) });
}

/** Zip or plain JSON (older backups) → payload. */
export function payloadFromBytes(bytes: Uint8Array): BackupPayload {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return parsePayload(strFromU8(bytes));
  const entry = unzipSync(bytes)[ZIP_ENTRY];
  if (!entry) throw new Error('Not a What to Watch backup file');
  return parsePayload(strFromU8(entry));
}

// Hermes and Node provide these globals; the TS lib config doesn't declare them.
declare function btoa(data: string): string;
declare function atob(data: string): string;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface PayloadStats {
  watching: number;
  watched: number;
  toWatch: number;
  rated: number;
  episodes: number;
  notes: number;
}

export function payloadStats(p: BackupPayload): PayloadStats {
  const count = (test: (status: string) => boolean) =>
    p.watchHistory.filter(h => test(h.status)).length;
  return {
    watching: count(s => s === 'watching'),
    watched: count(s => s === 'completed' || s === 'dropped'),
    toWatch: count(s => s === 'toWatch'),
    rated: p.ratings.length,
    episodes: p.episodes?.length ?? 0,
    notes: p.notes.length,
  };
}
