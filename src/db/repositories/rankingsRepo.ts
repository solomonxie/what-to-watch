import { and, asc, eq, gt } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { platformRankingsCache, cachedTitles } from '../schema';

export async function getPlatformRanking(
  platformId: string,
  region: string,
  category: string,
) {
  await ensureMigrated();
  return db
    .select({
      rank: platformRankingsCache.rank,
      title: cachedTitles,
    })
    .from(platformRankingsCache)
    .innerJoin(cachedTitles, eq(platformRankingsCache.titleId, cachedTitles.id))
    .where(
      and(
        eq(platformRankingsCache.platformId, platformId),
        eq(platformRankingsCache.region, region),
        eq(platformRankingsCache.category, category),
        gt(platformRankingsCache.ttlExpiresAt, Date.now()),
      ),
    )
    .orderBy(asc(platformRankingsCache.rank));
}

export async function replacePlatformRanking(
  platformId: string,
  region: string,
  category: string,
  titleIdsInRankOrder: string[],
  ttlMs = 1000 * 60 * 60 * 12,
) {
  await ensureMigrated();
  await db
    .delete(platformRankingsCache)
    .where(
      and(
        eq(platformRankingsCache.platformId, platformId),
        eq(platformRankingsCache.region, region),
        eq(platformRankingsCache.category, category),
      ),
    );
  if (titleIdsInRankOrder.length === 0) return;
  const now = Date.now();
  await db.insert(platformRankingsCache).values(
    titleIdsInRankOrder.map((titleId, index) => ({
      platformId,
      region,
      category,
      rank: index + 1,
      titleId,
      fetchedAt: now,
      ttlExpiresAt: now + ttlMs,
    })),
  );
}
