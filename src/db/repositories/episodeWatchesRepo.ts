import {
  addMarks,
  deleteMarks,
  getAllMarks,
  getMarksForTitle,
  setMarksStatus,
} from './marksRepo';
import {
  episodeKey,
  newestFirst,
  onEpisode,
  watchedEpisodes,
  type Mark,
} from '../../marks/derive';

// A ticked episode is a "watched" mark on it.

export interface EpisodeRef {
  season: number;
  episode: number;
}

export { episodeKey };

const isWatchedEpisode = (m: Mark) => onEpisode(m) && m.status === 'watched';

export async function getWatchedEpisodes(
  titleId: string,
): Promise<Set<string>> {
  return watchedEpisodes(await getMarksForTitle(titleId));
}

/**
 * Ticks or unticks episodes. Unticking deletes a plain tick; a mark with a
 * rating or review stays and only loses "watched". `at` dates new ticks.
 */
export async function setEpisodesWatched(
  titleId: string,
  episodes: EpisodeRef[],
  watched: boolean,
  at = Date.now(),
): Promise<void> {
  const marks = await getMarksForTitle(titleId);
  if (watched) {
    const seen = watchedEpisodes(marks);
    const fresh = episodes.filter(e => !seen.has(episodeKey(e)));
    await addMarks(
      titleId,
      fresh.map(e => ({ ...e, status: 'watched' as const, markedAt: at })),
    );
    return;
  }
  const keys = new Set(episodes.map(episodeKey));
  const hits = marks.filter(
    m =>
      isWatchedEpisode(m) &&
      keys.has(episodeKey({ season: m.season!, episode: m.episode! })),
  );
  const plain = hits.filter(m => m.rating === null && !m.review);
  await deleteMarks(
    titleId,
    plain.map(m => m.id!),
  );
  await setMarksStatus(
    titleId,
    hits.filter(m => !plain.includes(m)).map(m => m.id!),
    null,
  );
}

/** Each show's most recently watched episode. */
export async function getLatestEpisodes(): Promise<Map<string, EpisodeRef>> {
  const latest = new Map<string, EpisodeRef>();
  for (const m of (await getAllMarks())
    .filter(isWatchedEpisode)
    .sort(newestFirst))
    if (!latest.has(m.titleId))
      latest.set(m.titleId, { season: m.season!, episode: m.episode! });
  return latest;
}
