import { desc, eq, notInArray } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { responseCache } from '../schema';

export const MAX_CACHED_RESPONSES = 300;

/**
 * Returns the stored response while younger than ttlMs, else loads and stores it.
 * Keeps at most MAX_CACHED_RESPONSES, evicting the least recently used.
 * Falls back to a stale copy when loading fails.
 */
export async function cachedResponse<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  await ensureMigrated();
  const [row] = await db
    .select()
    .from(responseCache)
    .where(eq(responseCache.key, key))
    .limit(1);
  const now = Date.now();
  if (row && now - row.fetchedAt < ttlMs) {
    await db
      .update(responseCache)
      .set({ usedAt: now })
      .where(eq(responseCache.key, key));
    return JSON.parse(row.value) as T;
  }
  let value: T;
  try {
    value = await load();
  } catch (error) {
    if (row) return JSON.parse(row.value) as T;
    throw error;
  }
  const entry = { value: JSON.stringify(value), fetchedAt: now, usedAt: now };
  await db
    .insert(responseCache)
    .values({ key, ...entry })
    .onConflictDoUpdate({ target: responseCache.key, set: entry });
  await evictLeastRecentlyUsed();
  return value;
}

async function evictLeastRecentlyUsed() {
  const keep = db
    .select({ key: responseCache.key })
    .from(responseCache)
    .orderBy(desc(responseCache.usedAt))
    .limit(MAX_CACHED_RESPONSES);
  await db.delete(responseCache).where(notInArray(responseCache.key, keep));
}
