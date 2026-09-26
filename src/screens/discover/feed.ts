import { refreshPlatformRanking } from '../../catalog/catalogService';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import {
  readRecsCache,
  refreshRecs,
  type RecsCache,
  type RecsScope,
} from '../../recs/recsService';
import type { PlatformConfig } from '../../config/platforms';

type CachedTitle = Awaited<ReturnType<typeof getTitlesByIds>>[number];

export interface FeedItem {
  title: CachedTitle;
  rank?: number;
  reasons?: string[];
}

export interface Feed {
  kind: 'picks' | 'popular';
  items: FeedItem[];
  generatedAt?: number;
}

async function fromRecs(cache: RecsCache): Promise<Feed> {
  const titles = new Map(
    (await getTitlesByIds(cache.items.map(i => i.id))).map(t => [t.id, t]),
  );
  return {
    kind: 'picks',
    generatedAt: cache.generatedAt,
    items: cache.items.flatMap(i => {
      const title = titles.get(i.id);
      return title ? [{ title, reasons: i.reasons }] : [];
    }),
  };
}

export async function cachedPicks(scope: RecsScope): Promise<Feed | null> {
  const cache = await readRecsCache(scope);
  return cache ? fromRecs(cache) : null;
}

export async function freshPicks(scope: RecsScope): Promise<Feed> {
  return fromRecs(await refreshRecs(scope));
}

/** One platform's ranking, or all enabled platforms interleaved by rank. */
export async function popular(
  scope: RecsScope,
  platforms: PlatformConfig[],
  region: string,
  force: boolean,
): Promise<Feed> {
  if (scope) {
    const rows = await refreshPlatformRanking(scope, region, force);
    return {
      kind: 'popular',
      items: rows.map(r => ({ title: r.title, rank: r.rank })),
    };
  }
  const lists = await Promise.all(
    platforms.map(p =>
      refreshPlatformRanking(p, region, force).catch(() => []),
    ),
  );
  if (platforms.length && lists.every(l => l.length === 0)) {
    throw new Error("Couldn't load rankings");
  }
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const row = list[i];
      if (row && !seen.has(row.title.id)) {
        seen.add(row.title.id);
        items.push({ title: row.title });
      }
    }
  }
  return { kind: 'popular', items };
}
