import { GENRES } from '../config/taxonomy';
import { US_CONTENT_RATINGS, usRatings } from './ageRating';
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

const KIND_MEDIA: Record<TitleKind, MediaType[]> = {
  movie: ['movie'],
  documentary: ['movie'],
  series: ['tv'],
  docuseries: ['tv'],
  unscripted: ['tv'],
  animation: ['movie', 'tv'],
  anime: ['movie', 'tv'],
};

const ANIMATION = 16;
const isAnimated = (k: TitleKind) => k === 'animation' || k === 'anime';

// Documentary, Reality, Talk, News: what "series" leaves out.
const NOT_SCRIPTED_TV = '99,10764,10767,10763';

/** Filters that TMDB discover can apply; the rest stay client-side. */
export function hasServerFilters(f: FilterState): boolean {
  const d = DEFAULT_FILTERS;
  return (
    f.kinds.length > 0 ||
    f.ages.length > 0 ||
    f.certifications.length > 0 ||
    f.genres.length > 0 ||
    f.languages.length > 0 ||
    f.regions.length > 0 ||
    f.ratingRange[0] !== d.ratingRange[0] ||
    f.yearRange[0] !== d.yearRange[0] ||
    f.yearRange[1] !== d.yearRange[1]
  );
}

/** US ratings both the age and content-rating filters allow; null when neither is set. */
function allowedRatings(f: FilterState, mediaType: MediaType) {
  let certs = f.ages.length ? usRatings(f.ages, mediaType) : null;
  if (f.certifications.length) {
    const own = US_CONTENT_RATINGS[mediaType].filter(c =>
      f.certifications.includes(c),
    );
    certs = certs ? certs.filter(c => own.includes(c)) : own;
  }
  return certs;
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
    ? (['movie', 'tv'] as const).filter(m =>
        f.kinds.some(k => KIND_MEDIA[k].includes(m)),
      )
    : ['movie', 'tv'];
  const queries: FilterQuery[] = [];
  for (const mediaType of mediaTypes) {
    const kinds = f.kinds.filter(k => KIND_MEDIA[k].includes(mediaType));
    const animatedOnly = kinds.length > 0 && kinds.every(isAnimated);
    const animeOnly = kinds.length > 0 && kinds.every(k => k === 'anime');
    if (animeOnly && f.languages.length && !f.languages.includes('ja'))
      continue;
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
      // `,` ANDs but can't wrap an OR; several genres leave animation to applyFilters.
      params.with_genres =
        animatedOnly && ids.length === 1
          ? `${ANIMATION},${ids[0]}`
          : ids.join('|');
    } else if (animatedOnly) {
      params.with_genres = String(ANIMATION);
    }
    const without: string[] = [];
    if (
      mediaType === 'tv' &&
      kinds.length &&
      kinds.every(k => k === 'series' || isAnimated(k))
    )
      without.push(NOT_SCRIPTED_TV);
    if (kinds.length && !kinds.some(isAnimated))
      without.push(String(ANIMATION));
    if (without.length) params.without_genres = without.join(',');
    const certs = allowedRatings(f, mediaType);
    if (certs?.length === 0) continue;
    if (certs) {
      params.certification_country = 'US';
      params.certification = certs.join('|');
    }
    if (animeOnly) params.with_original_language = 'ja';
    else if (f.languages.length)
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
