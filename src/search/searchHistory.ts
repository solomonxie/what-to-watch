import { getKv, setKv } from '../db/repositories/kvRepo';

const KEY = 'search.history';
export const MAX_SEARCH_HISTORY = 20;

/** Newest first; a repeat (ignoring case) moves to the top. */
export function withQuery(history: string[], query: string): string[] {
  const q = query.trim();
  if (!q) return history;
  const rest = history.filter(h => h.toLowerCase() !== q.toLowerCase());
  return [q, ...rest].slice(0, MAX_SEARCH_HISTORY);
}

export async function getSearchHistory(): Promise<string[]> {
  const raw = await getKv(KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function saveSearchHistory(history: string[]): Promise<void> {
  await setKv(KEY, JSON.stringify(history));
}
