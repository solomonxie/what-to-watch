import { averageNormalizedScore } from './ratingNormalization';
import type {
  NormalizedTitle,
  ProviderId,
  ProviderRating,
  ProviderTitleDetails,
} from '../types/domain';

const SOURCE_PREFERENCE: ProviderId[] = ['tmdb', 'imdb', 'omdb'];

function sortByPreference(
  details: ProviderTitleDetails[],
): ProviderTitleDetails[] {
  return [...details].sort(
    (a, b) =>
      SOURCE_PREFERENCE.indexOf(a.providerId) -
      SOURCE_PREFERENCE.indexOf(b.providerId),
  );
}

function firstDefined<T>(
  sorted: ProviderTitleDetails[],
  pick: (d: ProviderTitleDetails) => T | undefined,
): T | undefined {
  for (const d of sorted) {
    const value = pick(d);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function mergeTitleDetails(
  detailsList: ProviderTitleDetails[],
  ratings: ProviderRating[] = [],
): NormalizedTitle {
  if (detailsList.length === 0) {
    throw new Error('mergeTitleDetails requires at least one provider result');
  }
  const sorted = sortByPreference(detailsList);
  const primary = sorted[0];

  const id =
    firstDefined(sorted, d => d.tmdbId) ??
    firstDefined(sorted, d => d.imdbId) ??
    firstDefined(sorted, d => d.omdbId) ??
    primary.externalId;

  const genres = Array.from(
    new Set(sorted.flatMap(d => d.genres).filter(Boolean)),
  );

  return {
    ...primary,
    id,
    title: firstDefined(sorted, d => d.title) ?? primary.title,
    originalTitle: firstDefined(sorted, d => d.originalTitle),
    overview: firstDefined(sorted, d => d.overview),
    posterPath: firstDefined(sorted, d => d.posterPath),
    releaseDate: firstDefined(sorted, d => d.releaseDate),
    runtimeMinutes: firstDefined(sorted, d => d.runtimeMinutes),
    genres,
    originalLanguage: firstDefined(sorted, d => d.originalLanguage),
    originCountries: firstDefined(sorted, d =>
      d.originCountries?.length ? d.originCountries : undefined,
    ),
    cast: firstDefined(sorted, d => (d.cast?.length ? d.cast : undefined)),
    imdbId: firstDefined(sorted, d => d.imdbId),
    tmdbId: firstDefined(sorted, d => d.tmdbId),
    omdbId: firstDefined(sorted, d => d.omdbId),
    ratings,
    primaryRatingScore: averageNormalizedScore(ratings),
  };
}
