import {
  cacheListTitle,
  refreshSearchIndex,
  showSeasons,
  titleIdFor,
} from '../catalog/catalogService';
import { getUserRatingForTitle } from '../db/repositories/ratingsRepo';
import { importMark } from '../db/repositories/marksRepo';
import { hasCjk, normalizeTitle, seasonOf, sequelNumber } from './matcher';
import { setZhTitleIfMissing } from '../db/repositories/titlesRepo';
import type { MarkStatus } from '../marks/derive';
import type { ResolvedEntry } from './resolve';
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

const SEASON_STATUS: Record<string, MarkStatus> = {
  completed: 'watched',
  watching: 'watching',
  toWatch: 'interested',
};

async function lastSeason(tmdbId: string): Promise<number | null> {
  try {
    const numbers = (await showSeasons(tmdbId)).seasons
      .map(s => s.number)
      .filter(n => n > 0);
    return numbers.length ? Math.max(...numbers) : null;
  } catch {
    return null;
  }
}

/**
 * Which season of the matched show a row is about: a season marker
 * ("第二季", "Season 2"), "最终季" as the show's last season, or a trailing
 * number ("龙樱2") when the show matched under a name without it.
 */
async function seasonOfRow(
  entry: ImportEntry,
  match: ResolvedEntry,
): Promise<number | null> {
  if (match.details.mediaType !== 'tv' || match.episode) return null;
  const listing = seasonOf(entry.titles);
  if (listing)
    return listing.season ?? (await lastSeason(match.details.externalId));
  const n = sequelNumber(entry.titles);
  const names = [match.details.title, match.details.originalTitle]
    .filter((t): t is string => !!t)
    .map(normalizeTitle);
  const ownName = entry.titles.some(t => names.includes(normalizeTitle(t)));
  return n && !ownName ? n : null;
}

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
          // Douban names it in Chinese: keep that, so it's searchable by it.
          const zh = (seasonOf(entry.titles)?.titles ?? entry.titles).find(
            hasCjk,
          );
          if (zh && !match.episode) await setZhTitleIfMissing(id, zh);
          await perTitle(id, async () => {
            const at = entry.date ?? Date.now();
            // An episode's score is for that episode, not the show.
            if (match.episode) {
              await setEpisodesWatched(id, [match.episode], true);
              summary.episodes++;
            }
            // A season row is a mark on that season: its rating, comment,
            // date and status. Other rated rows are marks on the show.
            const season = await seasonOfRow(entry, match);
            const review = entry.review?.trim() ?? '';
            const added =
              season !== null || (!match.episode && entry.rating)
                ? await importMark(id, {
                    season,
                    status:
                      season !== null ? SEASON_STATUS[entry.status] : null,
                    rating: entry.rating ?? null,
                    review,
                    markedAt: at,
                  })
                : false;
            const rated = added && !!entry.rating;
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
            if (wrote || added || match.episode) summary.imported++;
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
