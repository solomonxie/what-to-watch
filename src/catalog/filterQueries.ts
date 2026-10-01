import { GENRES } from '../config/taxonomy';
import { DEFAULT_FILTERS } from '../state/filterStore';
import type { FilterState, MediaType, TitleKind } from '../types/domain';

export interface FilterQuery {
  mediaType: MediaType;
  params: Record<string, string>;
}

export interface FilterQueryContext {
  region: string;
  providerIds: number[];
}

const KIND_MEDIA: Record<TitleKind, MediaType> = {
  movie: 'movie',
  documentary: 'movie',
  series: 'tv',
  docuseries: 'tv',
  unscripted: 'tv',
};

// Documentary, Reality, Talk, News: what "series" leaves out.
const NOT_SCRIPTED_TV = '99,10764,10767,10763';

/** Filters that TMDB discover can apply; the rest stay client-side. */
export function hasServerFilters(f: FilterState): boolean {
  const d = DEFAULT_FILTERS;
  return (
    f.kinds.length > 0 ||
    f.genres.length > 0 ||
    f.languages.length > 0 ||
    f.regions.length > 0 ||
    f.ratingRange[0] !== d.ratingRange[0] ||
    f.yearRange[0] !== d.yearRange[0] ||
    f.yearRange[1] !== d.yearRange[1]
  );
}

/**
 * TMDB discover queries for the active filters, on the user's services.
 * Lists within a filter are ORed (`|`), filters are ANDed — as applyFilters does.
 */
export function filterQueries(
  f: FilterState,
  ctx: FilterQueryContext,
): FilterQuery[] {
  const mediaTypes: MediaType[] = f.kinds.length
    ? Array.from(new Set(f.kinds.map(k => KIND_MEDIA[k])))
    : ['movie', 'tv'];
  const queries: FilterQuery[] = [];
  for (const mediaType of mediaTypes) {
    const params: Record<string, string> = {};
    if (ctx.providerIds.length) {
      params.watch_region = ctx.region;
      params.with_watch_providers = ctx.providerIds.join('|');
      params.with_watch_monetization_types = 'flatrate';
    }
    if (f.genres.length) {
      const ids = Array.from(
        new Set(
          f.genres
            .map(name => GENRES.find(g => g.name === name)?.[mediaType])
            .filter((id): id is number => !!id),
        ),
      );
      // None of the genres exist for this type: nothing of it can match.
      if (ids.length === 0) continue;
      params.with_genres = ids.join('|');
    }
    if (
      mediaType === 'tv' &&
      f.kinds.length &&
      f.kinds.every(k => k === 'series' || KIND_MEDIA[k] === 'movie')
    ) {
      params.without_genres = NOT_SCRIPTED_TV;
    }
    if (f.languages.length)
      params.with_original_language = f.languages.join('|');
    if (f.regions.length) params.with_origin_country = f.regions.join('|');
    if (f.ratingRange[0] > 0) {
      params['vote_average.gte'] = String(f.ratingRange[0] / 10);
      // A handful of votes makes any score; same floor as recommendations.
      params['vote_count.gte'] = mediaType === 'movie' ? '50' : '20';
    }
    const dateKey =
      mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
    if (f.yearRange[0] !== DEFAULT_FILTERS.yearRange[0])
      params[`${dateKey}.gte`] = `${f.yearRange[0]}-01-01`;
    if (f.yearRange[1] !== DEFAULT_FILTERS.yearRange[1])
      params[`${dateKey}.lte`] = `${f.yearRange[1]}-12-31`;
    queries.push({ mediaType, params });
  }
  return queries;
}
