import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { cachedTitles, settings } from '../db/schema';
import {
  FROM_WATCH_STATUS,
  groupByTitle,
  isTick,
  onEpisode,
  titleRating,
  titleState,
  type Mark,
} from '../marks/derive';
import type { WatchStatus } from '../types/domain';

// v3: one `marks` list. v2 and older kept notes, ratings, watch history and
// episode ticks apart; they're converted on read.
export const PAYLOAD_VERSION = 3;
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
  marks: NoId<Mark>[];
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
    marks: data.marks ?? legacyMarks(data),
    settings: data.settings ?? undefined,
    titles: data.titles ?? [],
    preferences: data.preferences ?? undefined,
  };
}

interface LegacyPayload {
  notes?: {
    titleId: string;
    body: string;
    rating?: number | null;
    markedAt?: number | null;
    createdAt: number;
    updatedAt: number;
  }[];
  ratings?: {
    titleId: string;
    rating: number;
    reviewText?: string | null;
    createdAt: number;
    updatedAt: number;
  }[];
  watchHistory?: { titleId: string; status: string; watchedAt: number }[];
  episodes?: {
    titleId: string;
    season: number;
    episode: number;
    watchedAt: number;
  }[];
}

const RATED_NOTE = /^(.*?)\s*·?\s*Rated (\d+(?:\.\d+)?)\/10\s*·?\s*(.*)$/s;
const AUTO_NOTE = /^(Interested|Watched \d+ of \d+ episodes)$/;

/** Older backups' separate lists, as marks (the same rules as migrations 0010-0011). */
export function legacyMarks(data: LegacyPayload): NoId<Mark>[] {
  const base = {
    season: null,
    episode: null,
    status: null,
    rating: null,
    review: '',
  };
  const notes = (data.notes ?? []).flatMap(n => {
    let { rating = null } = n;
    let review = n.body;
    const rated = rating === null ? review.match(RATED_NOTE) : null;
    if (rated) {
      rating = Number(rated[2]);
      review = [rated[1], rated[3]].filter(Boolean).join(' · ');
    } else if (rating === null && AUTO_NOTE.test(review)) return [];
    return [
      {
        ...base,
        titleId: n.titleId,
        rating,
        review,
        markedAt: n.markedAt ?? n.createdAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      },
    ];
  });
  const ratedInNotes = new Set(
    notes.filter(n => n.rating !== null).map(n => n.titleId),
  );
  const ratings = (data.ratings ?? [])
    .filter(r => !ratedInNotes.has(r.titleId))
    .map(r => ({
      ...base,
      titleId: r.titleId,
      rating: r.rating,
      review: r.reviewText ?? '',
      markedAt: r.updatedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  const statuses = (data.watchHistory ?? []).map(h => ({
    ...base,
    titleId: h.titleId,
    status: FROM_WATCH_STATUS[h.status as WatchStatus] ?? h.status,
    markedAt: h.watchedAt,
    createdAt: h.watchedAt,
    updatedAt: h.watchedAt,
  }));
  const episodes = (data.episodes ?? []).map(e => ({
    ...base,
    titleId: e.titleId,
    season: e.season,
    episode: e.episode,
    status: 'watched',
    markedAt: e.watchedAt,
    createdAt: e.watchedAt,
    updatedAt: e.watchedAt,
  }));
  return [...notes, ...ratings, ...statuses, ...episodes];
}

export function stripId<T extends { id?: unknown }>(row: T): Omit<T, 'id'> {
  const rest: Partial<T> = { ...row };
  delete rest.id;
  return rest as Omit<T, 'id'>;
}

// Hash of the user's own records only, so an unchanged dataset gates as
// unchanged. Titles are a re-fetchable cache and most of the bytes; hashing
// them took seconds on the phone.
export function contentHash(payload: BackupPayload): string {
  return fnv1a(
    JSON.stringify({ ...payload, exportedAt: undefined, titles: undefined }),
  );
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

export function hasUserData(p: Pick<BackupPayload, 'marks'>) {
  return p.marks.length > 0;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const dayKey = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** One iCloud file per day; later runs that day replace it. */
export function dailyZipName(date: Date): string {
  return `${dayKey(date)}-what-to-watch.zip`;
}

/** Everything the user made by hand; what a backup exists to keep. */
export function userRecordCount(p: Pick<BackupPayload, 'marks'>): number {
  return p.marks.length;
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
  const titles = [...groupByTitle(p.marks as Mark[]).values()];
  const states = titles.map(titleState);
  const count = (test: (status?: string) => boolean) =>
    states.filter(s => test(s?.status)).length;
  return {
    watching: count(s => s === 'watching'),
    watched: count(s => s === 'completed' || s === 'dropped'),
    toWatch: count(s => s === 'toWatch'),
    rated: titles.filter(t => titleRating(t)).length,
    episodes: p.marks.filter(
      m => onEpisode(m as Mark) && m.status === 'watched',
    ).length,
    notes: p.marks.filter(m => !isTick(m as Mark) && m.review).length,
  };
}
