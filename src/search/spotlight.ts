import { Spotlight, type SpotlightItem } from '../native/SpotlightModule';
import { getSearchableTitles } from '../db/repositories/titlesRepo';
import { getAllWatchHistory } from '../db/repositories/watchHistoryRepo';
import { getAllUserRatings } from '../db/repositories/ratingsRepo';
import { getKv, setKv } from '../db/repositories/kvRepo';
import { onDataChanged } from '../backup/changeFeed';
import { fnv1a } from '../backup/payload';
import { isDemo } from '../demo/demoMode';
import { joinMeta, mediaLabel, score10 } from '../ui/format';
import type { SearchableTitle } from './titleIndex';

const KV_INDEXED = 'spotlight.indexed';
const KV_FULL_AT = 'spotlight.fullAt';
// Re-send everything now and then, in case iOS dropped its index.
const FULL_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 5000;

export function spotlightItem(
  t: SearchableTitle,
  inLibrary: boolean,
): SpotlightItem {
  const year = t.releaseDate?.slice(0, 4);
  const score = score10(t.primaryRatingScore);
  return {
    id: t.id,
    domain: inLibrary ? 'library' : 'catalog',
    title: t.title,
    description: joinMeta([
      year,
      t.mediaType && mediaLabel(t.mediaType),
      score && `★ ${score}`,
      inLibrary && 'In your library',
    ]),
    keywords: [
      ...(t.originalTitle && t.originalTitle !== t.title
        ? [t.originalTitle]
        : []),
      ...t.genres,
      ...(t.castNames ?? []).slice(0, 5),
      ...(year ? [year] : []),
    ],
    rankingHint: inLibrary ? 2 : 1,
  };
}

export interface SyncPlan {
  index: SpotlightItem[];
  remove: string[];
  /** id → content hash, what Spotlight holds after the sync. */
  next: Record<string, string>;
}

/** Only new or changed items go to iOS, and only vanished ids are removed. */
export function planSync(
  items: SpotlightItem[],
  previous: Record<string, string>,
): SyncPlan {
  const next: Record<string, string> = {};
  const index: SpotlightItem[] = [];
  for (const item of items) {
    const hash = fnv1a(JSON.stringify(item));
    next[item.id] = hash;
    if (previous[item.id] !== hash) index.push(item);
  }
  const remove = Object.keys(previous).filter(id => !(id in next));
  return { index, remove, next };
}

/** Spotlight belongs to the real data: demo mode leaves it alone. */
const enabled = () => !isDemo();

async function syncOnce(): Promise<void> {
  if (!enabled() || !(await Spotlight.isAvailable())) return;
  const [titles, history, ratings, raw, fullAt] = await Promise.all([
    getSearchableTitles(),
    getAllWatchHistory(),
    getAllUserRatings(),
    getKv(KV_INDEXED),
    getKv(KV_FULL_AT),
  ]);
  const library = new Set([...history, ...ratings].map(r => r.titleId));
  const stale = Date.now() - Number(fullAt ?? 0) > FULL_EVERY_MS;
  const previous: Record<string, string> = raw && !stale ? JSON.parse(raw) : {};
  const plan = planSync(
    titles.map(t => spotlightItem(t, library.has(t.id))),
    previous,
  );
  if (stale) await Spotlight.removeAll();
  else if (plan.remove.length) await Spotlight.remove(plan.remove);
  if (plan.index.length) await Spotlight.index(plan.index);
  await setKv(KV_INDEXED, JSON.stringify(plan.next));
  if (stale) await setKv(KV_FULL_AT, String(Date.now()));
}

let running: Promise<void> | null = null;
let again = false;

export function syncSpotlight(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

export const spotlightIdle = () => running ?? Promise.resolve();

let timer: ReturnType<typeof setTimeout> | null = null;

/** After titles or the library change; bursts collapse into one sync. */
export function scheduleSpotlightSync(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncSpotlight().catch(() => {});
  }, DEBOUNCE_MS);
}

let started = false;

export function startSpotlightSync(): void {
  if (started) return;
  started = true;
  onDataChanged(scheduleSpotlightSync);
  scheduleSpotlightSync();
}
