import {
  cacheListTitle,
  refreshPlatformRanking,
} from '../../catalog/catalogService';
import { filterQueries } from '../../catalog/filterQueries';
import { discoverTitles } from '../../providers/tmdbProvider';
import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import {
  readRecsCache,
  refreshRecs,
  type RecsCache,
  type RecsScope,
} from '../../recs/recsService';
import type { PlatformConfig } from '../../config/platforms';
import type { FilterState } from '../../types/domain';

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

/**
 * The loaded feed is a few dozen titles, so narrow filters rarely match it.
 * Ask TMDB for titles matching the filters on the same services.
 */
export async function filtered(
  filters: FilterState,
  scope: RecsScope,
  platforms: PlatformConfig[],
  region: string,
): Promise<FeedItem[]> {
  const providerIds = (scope ? [scope] : platforms).map(p => p.tmdbProviderId);
  const queries = filterQueries(filters, { region, providerIds });
  const lists = await Promise.all(
    queries.map(q => discoverTitles(q.mediaType, q.params).catch(() => [])),
  );
  const ids: string[] = [];
  for (const item of lists.flat().sort((a, b) => b.popularity - a.popularity))
    ids.push(await cacheListTitle(item.details, item.ratings));
  const titles = new Map((await getTitlesByIds(ids)).map(t => [t.id, t]));
  return ids.flatMap(id => {
    const title = titles.get(id);
    return title ? [{ title }] : [];
  });
}
