import {
  cacheListTitle,
  refreshSearchIndex,
  titleIdFor,
} from '../catalog/catalogService';
import { getUserRatingForTitle } from '../db/repositories/ratingsRepo';
import { importMark } from '../db/repositories/notesRepo';
import { seasonOf } from './matcher';
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

/** Runs `fn` after any earlier call for the same key has finished. */
function serialized() {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const run = (tails.get(key) ?? Promise.resolve()).then(fn, fn);
    tails.set(
      key,
      run.catch(() => {}),
    );
    return run;
  };
}

function seasonLabel(season: number | undefined) {
  return season ? `Season ${season}` : 'Final season';
}

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
  // Seasons of one show arrive as separate rows; one at a time per show.
  const perTitle = serialized();

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
          await perTitle(id, async () => {
            const at = entry.date ?? Date.now();
            // An episode's score is for that episode, not the show.
            if (match.episode) {
              await setEpisodesWatched(id, [match.episode], true);
              summary.episodes++;
            }
            const listing =
              match.details.mediaType === 'tv' && !match.episode
                ? seasonOf(entry.titles)
                : null;
            // Each rated row is a mark; a season's carries its name. The
            // title's rating is then its latest mark's.
            const review = entry.review?.trim() ?? '';
            const rated =
              !match.episode && entry.rating
                ? await importMark(
                    id,
                    {
                      rating: entry.rating,
                      body: listing
                        ? [seasonLabel(listing.season), review]
                            .filter(Boolean)
                            .join(' · ')
                        : review,
                      markedAt: at,
                    },
                    review,
                  )
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
          });
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
