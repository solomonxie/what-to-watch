import {
  cacheListTitle,
  refreshSearchIndex,
  titleIdFor,
} from '../catalog/catalogService';
import {
  getUserRatingForTitle,
  importRating,
} from '../db/repositories/ratingsRepo';
import {
  getWatchEntry,
  setImportedStatus,
} from '../db/repositories/watchHistoryRepo';
import {
  getWatchedEpisodes,
  setEpisodesWatched,
} from '../db/repositories/episodeWatchesRepo';
import { derivedStatus } from './status';
import type { WatchStatus } from '../types/domain';
import { snapshotBeforeImport } from '../backup/backupService';
import { resolveEntry } from './resolve';
import type { ImportEntry, ParsedImport } from './types';

const CONCURRENCY = 4;

export interface ImportSummary {
  source: string;
  total: number;
  imported: number;
  watched: number;
  toWatch: number;
  watching: number;
  rated: number;
  skipped: number;
  /** Single episodes, marked watched on their show. */
  episodes: number;
  /** Rows that aren't movies or shows. */
  ignored: number;
  unmatched: ImportEntry[];
}

export async function runImport(
  parsed: ParsedImport,
  onProgress: (done: number, total: number) => void,
): Promise<ImportSummary> {
  await snapshotBeforeImport();
  const summary: ImportSummary = {
    source: parsed.source,
    total: parsed.entries.length,
    imported: 0,
    watched: 0,
    toWatch: 0,
    watching: 0,
    rated: 0,
    skipped: 0,
    episodes: 0,
    ignored: parsed.ignored,
    unmatched: [],
  };
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < parsed.entries.length) {
      const entry = parsed.entries[next++];
      try {
        const match = await resolveEntry(entry);
        if (!match) {
          summary.unmatched.push(entry);
        } else {
          await cacheListTitle(match.details, match.ratings);
          const id = titleIdFor(
            match.details.mediaType,
            match.details.externalId,
          );
          const at = entry.date ?? Date.now();
          // An episode's score is for that episode, not the show.
          if (match.episode) {
            await setEpisodesWatched(id, [match.episode], true);
            summary.episodes++;
          }
          const rated =
            !match.episode && entry.rating
              ? await importRating(id, entry.rating, entry.review, at)
              : false;
          const status = derivedStatus({
            mediaType: match.details.mediaType,
            source: match.episode ? undefined : entry.status,
            rated: rated || !!(await getUserRatingForTitle(id)),
            episodesWatched: (await getWatchedEpisodes(id)).size,
            current: (await getWatchEntry(id))?.status as
              | WatchStatus
              | undefined,
          });
          const wrote = await setImportedStatus(id, status, at);
          if (wrote || rated || match.episode) summary.imported++;
          else summary.skipped++;
          if (wrote) {
            if (status === 'completed') summary.watched++;
            else if (status === 'toWatch') summary.toWatch++;
            else summary.watching++;
          }
          if (rated) summary.rated++;
        }
      } catch {
        summary.unmatched.push(entry);
      }
      onProgress(++done, parsed.entries.length);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await refreshSearchIndex();
  return summary;
}
