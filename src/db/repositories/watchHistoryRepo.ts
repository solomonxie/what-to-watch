import {
  addMarks,
  deleteMarks,
  getAllMarks,
  getMarksForTitle,
  setMarksStatus,
} from './marksRepo';
import {
  FROM_WATCH_STATUS,
  groupByTitle,
  newestFirst,
  onTitle,
  titleState,
  type Mark,
} from '../../marks/derive';
import type { WatchStatus } from '../../types/domain';

// A title's watch status is read from its marks; changing it writes one.

export { DROP_BELOW } from '../../marks/derive';

export interface WatchEntry {
  titleId: string;
  status: WatchStatus;
  /** When the status was set. */
  watchedAt: number;
  /** Completed viewings. */
  rewatchCount: number;
}

function toEntry(titleId: string, marks: Mark[]): WatchEntry | undefined {
  const state = titleState(marks);
  return state
    ? {
        titleId,
        status: state.status,
        watchedAt: state.at,
        rewatchCount: state.watchCount,
      }
    : undefined;
}

export async function getWatchEntry(titleId: string) {
  return toEntry(titleId, await getMarksForTitle(titleId));
}

export async function getAllWatchHistory(): Promise<WatchEntry[]> {
  return [...groupByTitle(await getAllMarks())].flatMap(
    ([titleId, marks]) => toEntry(titleId, marks) ?? [],
  );
}

const ownStatus = (marks: Mark[]) =>
  [...marks].sort(newestFirst).find(m => onTitle(m) && m.status);

/**
 * Sets the title-level status. `keepTime`: a status re-derived without a user
 * action keeps the date of the one it replaces, so viewing moves nothing.
 */
async function writeStatus(
  titleId: string,
  status: WatchStatus,
  { at = Date.now(), keepTime = false } = {},
): Promise<boolean> {
  const marks = await getMarksForTitle(titleId);
  const own = ownStatus(marks);
  const next = FROM_WATCH_STATUS[status];
  if (own?.status === next) return false;
  if (keepTime && own && own.rating === null && !own.review)
    await setMarksStatus(titleId, [own.id!], next);
  else
    await addMarks(titleId, [
      { status: next, markedAt: keepTime && own ? own.markedAt : at },
    ]);
  return true;
}

/** Interested = on the to-watch list; only applies before watching starts. */
export async function setInterested(titleId: string, interested: boolean) {
  const marks = await getMarksForTitle(titleId);
  if (interested) {
    if (!titleState(marks)) await writeStatus(titleId, 'toWatch');
    return;
  }
  const wishes = marks.filter(m => onTitle(m) && m.status === 'interested');
  const plain = wishes.filter(m => m.rating === null && !m.review);
  await deleteMarks(
    titleId,
    plain.map(m => m.id!),
  );
  await setMarksStatus(
    titleId,
    wishes.filter(m => !plain.includes(m)).map(m => m.id!),
    null,
  );
}

/** A movie counts as watched once rated. */
export async function markFinished(titleId: string) {
  if ((await getWatchEntry(titleId))?.status === 'completed') return;
  await writeStatus(titleId, 'completed');
}

/** After a mark is saved: a rated movie is watched. A low score drops a show by itself. */
export async function applyRatingToStatus(titleId: string) {
  if (!titleId.startsWith('movie:')) return;
  const marks = await getMarksForTitle(titleId);
  if (marks.some(m => onTitle(m) && m.rating !== null))
    await markFinished(titleId);
}

/**
 * Show status from episode progress: all aired watched → completed, some →
 * watching, none (after unticking) → back to the list. `touch` marks a user
 * action; otherwise the status keeps its date.
 */
export async function syncShowProgress(
  titleId: string,
  watchedEpisodes: number,
  airedEpisodes: number,
  { touch = true }: { touch?: boolean; rating?: number } = {},
) {
  const entry = await getWatchEntry(titleId);
  if (watchedEpisodes === 0) {
    if (touch && entry && entry.status !== 'toWatch')
      await writeStatus(titleId, 'toWatch');
    return;
  }
  const status: WatchStatus =
    airedEpisodes > 0 && watchedEpisodes >= airedEpisodes
      ? 'completed'
      : 'watching';
  await writeStatus(titleId, status, { keepTime: !touch });
}

/** Writes an imported title's derived status; true if anything changed. */
export async function setImportedStatus(
  titleId: string,
  status: WatchStatus,
  at: number,
): Promise<boolean> {
  return writeStatus(titleId, status, { at });
}
