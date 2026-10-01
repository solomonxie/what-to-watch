import { discoverTitles } from '../providers/tmdbProvider';
import { isProviderActive } from '../providers/providerRegistry';
import { cacheListTitle, refreshSearchIndex } from '../catalog/catalogService';
import { getAllWatchHistory } from '../db/repositories/watchHistoryRepo';
import { getKv, setKv } from '../db/repositories/kvRepo';
import { getSettings } from '../db/repositories/settingsRepo';
import { PLATFORMS, type PlatformConfig } from '../config/platforms';
import { readPreferences, type Preferences } from '../prefs/prefsStore';
import {
  planHash,
  planQueries,
  scoreCandidates,
  type Candidate,
  type PlanContext,
} from './recommender';

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LIMIT = 60;

/** null = all enabled services. */
export type RecsScope = PlatformConfig | null;

const cacheKey = (scope: RecsScope) => `recs.cache.${scope?.id ?? 'all'}`;

export interface RecItem {
  id: string;
  title: string;
  posterPath?: string;
  mediaType: string;
  reasons: string[];
}

export interface RecsCache {
  generatedAt: number;
  hash: string;
  items: RecItem[];
}

/** A platform scope always restricts to that service; "all" follows the taste setting. */
async function context(scope: RecsScope): Promise<PlanContext> {
  const settings = await getSettings();
  return {
    region: settings.defaultRegion,
    providerIds: scope
      ? [scope.tmdbProviderId]
      : PLATFORMS.filter(p => settings.enabledPlatformIds.includes(p.id)).map(
          p => p.tmdbProviderId,
        ),
  };
}

const scoped = (prefs: Preferences, scope: RecsScope): Preferences =>
  scope ? { ...prefs, onlyMyServices: true } : prefs;

export async function readRecsCache(
  scope: RecsScope,
): Promise<RecsCache | null> {
  const raw = await getKv(cacheKey(scope));
  return raw ? (JSON.parse(raw) as RecsCache) : null;
}

/** True when the cache is missing, old, or built from a different profile/context. */
export async function recsNeedRefresh(
  cache: RecsCache | null,
  prefs: Preferences,
  scope: RecsScope,
) {
  if (!cache) return true;
  if (Date.now() - cache.generatedAt > MAX_AGE_MS) return true;
  return cache.hash !== planHash(scoped(prefs, scope), await context(scope));
}

export async function refreshRecs(scope: RecsScope): Promise<RecsCache> {
  if (!(await isProviderActive('tmdb')))
    throw new Error('TMDB API key is not configured');
  const prefs = scoped(await readPreferences(), scope);
  const ctx = await context(scope);
  const queries = planQueries(prefs, ctx);

  const settled = await Promise.allSettled(
    queries.map(async q =>
      (
        await discoverTitles(q.mediaType, q.params)
      ).map((c): Candidate => ({ ...c, tags: q.tag ? [q.tag] : [] })),
    ),
  );
  const failures = settled.filter(r => r.status === 'rejected');
  if (queries.length > 0 && failures.length === queries.length) {
    throw (failures[0] as PromiseRejectedResult).reason;
  }
  const candidates = settled.flatMap(r =>
    r.status === 'fulfilled' ? r.value : [],
  );

  const exclude = new Set((await getAllWatchHistory()).map(h => h.titleId));
  const recs = scoreCandidates(candidates, prefs, exclude).slice(0, LIMIT);

  const items: RecItem[] = [];
  for (const rec of recs) {
    const id = await cacheListTitle(
      rec.candidate.details,
      rec.candidate.ratings,
    );
    items.push({
      id,
      title: rec.candidate.details.title,
      posterPath: rec.candidate.details.posterPath,
      mediaType: rec.mediaType,
      reasons: rec.reasons,
    });
  }
  const cache: RecsCache = {
    generatedAt: Date.now(),
    hash: planHash(prefs, ctx),
    items,
  };
  await setKv(cacheKey(scope), JSON.stringify(cache));
  refreshSearchIndex().catch(() => {});
  return cache;
}
