import {
  findByImdbId,
  findEpisodeByImdbId,
  getTmdbFullTitle,
  searchDetailed,
  type DiscoveredTitleMeta,
} from '../providers/tmdbProvider';
import {
  CERTAIN_MATCH,
  bestScored,
  hasCjk,
  seasonOf,
  remakeOf,
  seriesNames,
} from './matcher';
import type { ImportEntry } from './types';

/** The TMDB title an import row refers to: by id when it has one, else by name. */
export type ResolvedEntry = DiscoveredTitleMeta & {
  /** Set when the row was a single episode of this show. */
  episode?: { season: number; episode: number };
};

export async function resolveEntry(
  entry: ImportEntry,
): Promise<ResolvedEntry | null> {
  // An episode is never searched by name: its title would find some other show.
  if (entry.episode) {
    const ep = entry.imdbId && (await findEpisodeByImdbId(entry.imdbId));
    if (!ep) return null;
    const full = await getTmdbFullTitle(ep.showId, 'tv', 'US');
    return {
      details: full.details,
      ratings: full.ratings,
      popularity: 0,
      voteAverage: 0,
      episode: { season: ep.season, episode: ep.episode },
    };
  }
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
  const byName = await searchByName(entry);
  if (byName) return byName;
  // A season listed on its own: find the show it belongs to. Its year is the
  // season's, so only require the show to have started by then.
  const startedBy = (c: DiscoveredTitleMeta) =>
    !entry.year ||
    !c.details.releaseDate ||
    Number(c.details.releaseDate.slice(0, 4)) <= entry.year + 1;
  const listing = seasonOf(entry.titles);
  if (listing) {
    const show = await searchByName(
      { ...entry, titles: listing.titles, mediaType: 'tv', year: undefined },
      c => c.details.mediaType === 'tv' && startedBy(c),
    );
    if (show) return show;
  }
  const remake = remakeOf(entry.titles);
  if (remake) {
    const exact = await searchByName(
      { ...entry, ...remake },
      c => c.details.releaseDate?.slice(0, 4) === String(remake.year),
    );
    if (exact) return exact;
  }
  // An arc, part or numbered sequel: the series it belongs to.
  const series = seriesNames(listing?.titles ?? entry.titles);
  if (series.length === 0) return null;
  return searchByName(
    { ...entry, titles: series, mediaType: 'tv', year: undefined },
    c => c.details.mediaType === 'tv' && startedBy(c),
  );
}

async function searchByName(
  entry: ImportEntry,
  accept: (c: DiscoveredTitleMeta) => boolean = () => true,
): Promise<DiscoveredTitleMeta | null> {
  let best: ReturnType<typeof bestScored> = null;
  for (const title of entry.titles) {
    const results = await searchDetailed(
      title,
      hasCjk(title) ? 'zh-CN' : 'en-US',
    );
    const found = bestScored(entry, results.filter(accept));
    if (found && (!best || found.score > best.score)) best = found;
    if (best && best.score >= CERTAIN_MATCH) break;
  }
  return best?.c ?? null;
}
