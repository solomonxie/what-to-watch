import { and, eq, inArray } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { episodeWatches } from '../schema';
import { markDataChanged } from '../../backup/changeFeed';

export interface EpisodeRef {
  season: number;
  episode: number;
}

export const episodeKey = (e: EpisodeRef) => `${e.season}:${e.episode}`;

export async function getWatchedEpisodes(
  titleId: string,
): Promise<Set<string>> {
  await ensureMigrated();
  const rows = await db
    .select()
    .from(episodeWatches)
    .where(eq(episodeWatches.titleId, titleId));
  return new Set(rows.map(episodeKey));
}

export async function setEpisodesWatched(
  titleId: string,
  episodes: EpisodeRef[],
  watched: boolean,
): Promise<void> {
  markDataChanged();
  await ensureMigrated();
  if (episodes.length === 0) return;
  if (watched) {
    const watchedAt = Date.now();
    await db
      .insert(episodeWatches)
      .values(episodes.map(e => ({ titleId, ...e, watchedAt })))
      .onConflictDoNothing();
    return;
  }
  for (const season of new Set(episodes.map(e => e.season))) {
    await db.delete(episodeWatches).where(
      and(
        eq(episodeWatches.titleId, titleId),
        eq(episodeWatches.season, season),
        inArray(
          episodeWatches.episode,
          episodes.filter(e => e.season === season).map(e => e.episode),
        ),
      ),
    );
  }
}

/** Most recently marked episode per title. */
export async function getLatestEpisodes(): Promise<Map<string, EpisodeRef>> {
  const rows = (await getAllEpisodeWatches()).sort(
    (a, b) =>
      a.watchedAt - b.watchedAt || a.season - b.season || a.episode - b.episode,
  );
  return new Map(
    rows.map(r => [r.titleId, { season: r.season, episode: r.episode }]),
  );
}

export async function getAllEpisodeWatches() {
  await ensureMigrated();
  return db.select().from(episodeWatches);
}
