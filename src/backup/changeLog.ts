import type { BackupPayload } from './payload';

export const LOCAL_LOG = 'changes.jsonl';
export const ICLOUD_LOG = 'what-to-watch-changes.jsonl';

type Fields = Record<string, unknown>;
type Table = Record<string, Fields>;

/** What the log compares: user data keyed by a stable id, no ids or caches. */
export interface LogState {
  watch: Table;
  ratings: Table;
  notes: Table;
  episodes: Table;
  settings: Table;
  preferences: Table;
}

export interface ChangeEntry {
  at: string;
  kind: keyof LogState;
  op: 'add' | 'change' | 'remove';
  key: string;
  title?: string;
  before?: Fields;
  after?: Fields;
}

const byKey = <T>(rows: T[], key: (r: T) => string, fields: (r: T) => Fields) =>
  Object.fromEntries(rows.map(r => [key(r), fields(r)]));

const single = (value: unknown): Table =>
  value && typeof value === 'object' ? { all: value as Fields } : {};

export function logState(p: BackupPayload): LogState {
  return {
    watch: byKey(
      p.watchHistory,
      r => r.titleId,
      r => ({
        status: r.status,
        watchedAt: r.watchedAt,
        rewatchCount: r.rewatchCount,
      }),
    ),
    ratings: byKey(
      p.ratings,
      r => r.titleId,
      r => ({ rating: r.rating, reviewText: r.reviewText ?? null }),
    ),
    notes: byKey(
      p.notes,
      r => `${r.titleId}@${r.createdAt}`,
      r => ({ body: r.body, markedAt: r.markedAt ?? null }),
    ),
    episodes: byKey(
      p.episodes ?? [],
      r => `${r.titleId}/S${r.season}E${r.episode}`,
      r => ({ watchedAt: r.watchedAt }),
    ),
    settings: single(p.settings),
    preferences: single(p.preferences),
  };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Only the fields that differ, so a line reads as what happened. */
function changedFields(before: Fields, after: Fields) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const diff = keys.filter(k => !same(before[k], after[k]));
  const pick = (f: Fields) => Object.fromEntries(diff.map(k => [k, f[k]]));
  return { before: pick(before), after: pick(after) };
}

export function diffStates(
  prev: LogState,
  next: LogState,
  at: Date,
  titleNames: Record<string, string> = {},
): ChangeEntry[] {
  const stamp = at.toISOString();
  const entries: ChangeEntry[] = [];
  for (const kind of Object.keys(next) as (keyof LogState)[]) {
    const a = prev[kind] ?? {};
    const b = next[kind];
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])]) {
      if (same(a[key], b[key])) continue;
      const title = titleNames[key.split(/[@/]/)[0]];
      const base = { at: stamp, kind, key, ...(title ? { title } : {}) };
      if (!a[key]) entries.push({ ...base, op: 'add', after: b[key] });
      else if (!b[key]) entries.push({ ...base, op: 'remove', before: a[key] });
      else
        entries.push({
          ...base,
          op: 'change',
          ...changedFields(a[key], b[key]),
        });
    }
  }
  return entries;
}

export const toJsonl = (entries: ChangeEntry[]) =>
  entries.map(e => JSON.stringify(e) + '\n').join('');
