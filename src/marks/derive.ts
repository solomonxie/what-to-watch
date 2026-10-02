import type { WatchStatus } from '../types/domain';

// Every user fact is a mark: on a title, a season or an episode, with an
// optional status, rating and review. Everything else is read from them.

export type MarkStatus = 'interested' | 'watching' | 'watched' | 'dropped';

export interface Mark {
  id?: number | null;
  titleId: string;
  season: number | null;
  episode: number | null;
  status: string | null;
  rating: number | null;
  review: string;
  markedAt: number;
  createdAt: number;
  updatedAt: number;
}

/** Below this score a show in progress counts as dropped. */
export const DROP_BELOW = 5;

export const newestFirst = (a: Mark, b: Mark) =>
  b.markedAt - a.markedAt || (b.id ?? 0) - (a.id ?? 0);

export const onTitle = (m: Mark) => m.season === null;
export const onSeason = (m: Mark) => m.season !== null && m.episode === null;
export const onEpisode = (m: Mark) => m.episode !== null;
/** A plain tick: an episode watched, nothing written about it. */
export const isTick = (m: Mark) =>
  onEpisode(m) && m.status === 'watched' && m.rating === null && !m.review;

const TO_WATCH_STATUS: Record<MarkStatus, WatchStatus> = {
  interested: 'toWatch',
  watching: 'watching',
  watched: 'completed',
  dropped: 'dropped',
};
export const FROM_WATCH_STATUS: Record<WatchStatus, MarkStatus> = {
  toWatch: 'interested',
  watching: 'watching',
  completed: 'watched',
  dropped: 'dropped',
};

export function groupByTitle(marks: Mark[]): Map<string, Mark[]> {
  const groups = new Map<string, Mark[]>();
  for (const m of marks) {
    const list = groups.get(m.titleId);
    if (list) list.push(m);
    else groups.set(m.titleId, [m]);
  }
  for (const list of groups.values()) list.sort(newestFirst);
  return groups;
}

/** The title's rating: its latest rated title-level mark. */
export function titleRating(marks: Mark[]): Mark | undefined {
  return [...marks]
    .sort(newestFirst)
    .find(m => onTitle(m) && m.rating !== null);
}

/** Each season's latest rating, by season number. */
export function seasonRatings(
  marks: Mark[],
): { season: number; rating: number }[] {
  const latest = new Map<number, number>();
  for (const m of [...marks].sort(newestFirst))
    if (onSeason(m) && m.rating !== null && !latest.has(m.season!))
      latest.set(m.season!, m.rating);
  return [...latest]
    .map(([season, rating]) => ({ season, rating }))
    .sort((a, b) => a.season - b.season);
}

export interface TitleState {
  status: WatchStatus;
  /** When that status was set. */
  at: number;
  /** Completed viewings. */
  watchCount: number;
}

/**
 * The title's status: its latest title-level status; otherwise watching if
 * any season or episode has one, or completed once rated. A show in
 * progress rated low reads as dropped.
 */
export function titleState(marks: Mark[]): TitleState | undefined {
  const sorted = [...marks].sort(newestFirst);
  const own = sorted.find(m => onTitle(m) && m.status);
  const inner = sorted.find(m => !onTitle(m) && m.status);
  const rated = titleRating(sorted);
  let state: TitleState | undefined;
  if (own)
    state = {
      status: TO_WATCH_STATUS[own.status as MarkStatus] ?? 'watching',
      at: own.markedAt,
      watchCount: 0,
    };
  else if (inner)
    state = { status: 'watching', at: inner.markedAt, watchCount: 0 };
  else if (rated)
    state = { status: 'completed', at: rated.markedAt, watchCount: 0 };
  if (!state) return undefined;
  if (
    state.status === 'watching' &&
    rated?.rating != null &&
    rated.rating < DROP_BELOW
  )
    state.status = 'dropped';
  const viewings = sorted.filter(m => onTitle(m) && m.status === 'watched');
  state.watchCount = viewings.length || (state.status === 'completed' ? 1 : 0);
  return state;
}

export const episodeKey = (e: { season: number; episode: number }) =>
  `${e.season}:${e.episode}`;

export function watchedEpisodes(marks: Mark[]): Set<string> {
  return new Set(
    marks
      .filter(m => onEpisode(m) && m.status === 'watched')
      .map(m => episodeKey({ season: m.season!, episode: m.episode! })),
  );
}

/** When the title last changed by the user's hand. */
export function lastChange(marks: Mark[]): number {
  return Math.max(0, ...marks.map(m => m.markedAt));
}
