import {
  findByImdbId,
  getTmdbFullTitle,
  searchDetailed,
} from '../providers/tmdbProvider';
import type { DiscoveredTitleMeta } from '../providers/tmdbProvider';
import {
  cacheListTitle,
  refreshSearchIndex,
  titleIdFor,
} from '../catalog/catalogService';
import { importRating } from '../db/repositories/ratingsRepo';
import { importWatch } from '../db/repositories/watchHistoryRepo';
import { snapshotBeforeImport } from '../backup/backupService';
import { bestMatch, hasCjk } from './matcher';
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
  unmatched: ImportEntry[];
}

async function resolve(
  entry: ImportEntry,
): Promise<DiscoveredTitleMeta | null> {
  if (entry.tmdbId && entry.mediaType) {
    const full = await getTmdbFullTitle(entry.tmdbId, entry.mediaType, 'US');
    return {
      details: full.details,
      ratings: full.ratings,
      popularity: 0,
      voteAverage: 0,
    };
  }
  if (entry.imdbId) {
    const found = await findByImdbId(entry.imdbId);
    if (found) return found;
  }
  for (const title of entry.titles) {
    const results = await searchDetailed(
      title,
      hasCjk(title) ? 'zh-CN' : 'en-US',
    );
    const match = bestMatch(entry, results);
    if (match) return match;
  }
  return null;
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
    unmatched: [],
  };
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < parsed.entries.length) {
      const entry = parsed.entries[next++];
      try {
        const match = await resolve(entry);
        if (!match) {
          summary.unmatched.push(entry);
        } else {
          await cacheListTitle(match.details, match.ratings);
          const id = titleIdFor(
            match.details.mediaType,
            match.details.externalId,
          );
          const wrote = await importWatch(
            id,
            entry.status,
            entry.date ?? Date.now(),
          );
          const rated = entry.rating
            ? await importRating(
                id,
                entry.rating,
                entry.review,
                entry.date ?? Date.now(),
              )
            : false;
          if (wrote || rated) summary.imported++;
          else summary.skipped++;
          if (wrote) {
            if (entry.status === 'completed') summary.watched++;
            else if (entry.status === 'toWatch') summary.toWatch++;
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
