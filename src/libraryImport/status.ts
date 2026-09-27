import type { WatchStatus } from '../types/domain';
import type { ImportStatus } from './types';

/**
 * A title's status from facts, not from what another app called it:
 * - movie: rated → watched, otherwise to watch.
 * - series: the source says watched, or it's already finished or dropped
 *   here → that; otherwise any episode marked → watching, none → to watch.
 *   A source's "watching" carries no weight without episode marks.
 */
export function derivedStatus(input: {
  mediaType: string;
  source?: ImportStatus;
  rated: boolean;
  episodesWatched: number;
  current?: WatchStatus;
}): WatchStatus {
  if (input.mediaType === 'movie') return input.rated ? 'completed' : 'toWatch';
  if (input.source === 'completed') return 'completed';
  if (input.current === 'completed' || input.current === 'dropped')
    return input.current;
  return input.episodesWatched > 0 ? 'watching' : 'toWatch';
}
