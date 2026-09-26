import {
  GENRES,
  countryName,
  languageName,
  unifiedGenres,
} from '../config/taxonomy';
import type { Preferences } from '../prefs/prefsStore';
import type {
  MediaType,
  ProviderRating,
  ProviderTitleDetails,
} from '../types/domain';

export interface Query {
  mediaType: MediaType;
  params: Record<string, string>;
  tag?: { kind: 'topic' | 'country'; value: string };
}

export interface Candidate {
  details: ProviderTitleDetails;
  ratings: ProviderRating[];
  popularity: number;
  voteAverage: number;
  tags?: Query['tag'][];
}

export interface Recommendation {
  id: string;
  mediaType: MediaType;
  tmdbId: string;
  score: number;
  reasons: string[];
  candidate: Candidate;
}

export interface PlanContext {
  region: string;
  providerIds: number[];
}

const WEIGHTS = {
  genre: 0.35,
  topic: 0.25,
  language: 0.15,
  country: 0.1,
  quality: 0.15,
};
const MAX_GENRE_QUERIES = 3;
const MAX_TOPIC_QUERIES = 2;
const MAX_COUNTRY_QUERIES = 2;

/** Weight of the item at rank i (0-based) in a list of n: 1 for the first, 0.4 floor. */
export function rankWeight(i: number, n: number): number {
  return n <= 1 ? 1 : 1 - (i / (n - 1)) * 0.6;
}

function mediaTypesOf(prefs: Preferences): MediaType[] {
  return prefs.mediaTypes === 'both' ? ['movie', 'tv'] : [prefs.mediaTypes];
}

export function planQueries(prefs: Preferences, ctx: PlanContext): Query[] {
  const queries: Query[] = [];
  for (const mediaType of mediaTypesOf(prefs)) {
    const base: Record<string, string> = {
      'vote_count.gte': mediaType === 'movie' ? '50' : '20',
    };
    if (prefs.onlyMyServices && ctx.providerIds.length) {
      base.watch_region = ctx.region;
      base.with_watch_providers = ctx.providerIds.join('|');
      base.with_watch_monetization_types = 'flatrate';
    }
    const languages = prefs.languages.slice(0, 3).join('|');

    const genreIds = prefs.genres
      .map(name => GENRES.find(g => g.name === name)?.[mediaType])
      .filter((id): id is number => !!id);
    const uniqueGenreIds = Array.from(new Set(genreIds)).slice(
      0,
      MAX_GENRE_QUERIES,
    );
    for (const id of uniqueGenreIds) {
      queries.push({
        mediaType,
        params: {
          ...base,
          with_genres: String(id),
          ...(languages ? { with_original_language: languages } : {}),
        },
      });
    }
    if (uniqueGenreIds.length === 0 && languages) {
      queries.push({
        mediaType,
        params: { ...base, with_original_language: languages },
      });
    }
    for (const topic of prefs.topics.slice(0, MAX_TOPIC_QUERIES)) {
      queries.push({
        mediaType,
        params: { ...base, with_keywords: String(topic.id) },
        tag: { kind: 'topic', value: topic.name },
      });
    }
    for (const country of prefs.countries.slice(0, MAX_COUNTRY_QUERIES)) {
      queries.push({
        mediaType,
        params: { ...base, with_origin_country: country },
        tag: { kind: 'country', value: country },
      });
    }
  }
  return queries;
}

function bestMatch(
  ranked: string[],
  values: string[],
): { weight: number; name?: string } {
  let best = { weight: 0, name: undefined as string | undefined };
  ranked.forEach((name, i) => {
    const w = rankWeight(i, ranked.length);
    if (values.includes(name) && w > best.weight) best = { weight: w, name };
  });
  return best;
}

export function scoreCandidates(
  candidates: Candidate[],
  prefs: Preferences,
  exclude: Set<string>,
): Recommendation[] {
  const merged = new Map<string, Candidate>();
  for (const c of candidates) {
    const id = `${c.details.mediaType}:${c.details.externalId}`;
    const prev = merged.get(id);
    merged.set(
      id,
      prev ? { ...prev, tags: [...(prev.tags ?? []), ...(c.tags ?? [])] } : c,
    );
  }

  const recs: Recommendation[] = [];
  for (const [id, c] of merged) {
    if (exclude.has(id)) continue;
    const tags = c.tags ?? [];
    const genres = c.details.genres.flatMap(unifiedGenres);
    const countries = [
      ...(c.details.originCountries ?? []),
      ...tags.filter(t => t?.kind === 'country').map(t => t!.value),
    ];
    const topics = tags.filter(t => t?.kind === 'topic').map(t => t!.value);

    const genre = bestMatch(prefs.genres, genres);
    const topic = bestMatch(
      prefs.topics.map(t => t.name),
      topics,
    );
    const language = bestMatch(
      prefs.languages,
      c.details.originalLanguage ? [c.details.originalLanguage] : [],
    );
    const country = bestMatch(prefs.countries, countries);

    const parts = [
      { w: WEIGHTS.genre * genre.weight, label: genre.name },
      { w: WEIGHTS.topic * topic.weight, label: topic.name },
      {
        w: WEIGHTS.language * language.weight,
        label: language.name && languageName(language.name),
      },
      {
        w: WEIGHTS.country * country.weight,
        label: country.name && countryName(country.name),
      },
    ];
    const match = parts.reduce((sum, p) => sum + p.w, 0);
    if (match === 0) continue;
    const score =
      match +
      WEIGHTS.quality * Math.min(1, c.voteAverage / 10) +
      0.02 * Math.min(1, c.popularity / 200);
    recs.push({
      id,
      mediaType: c.details.mediaType,
      tmdbId: c.details.externalId,
      score,
      reasons: parts
        .filter(p => p.w > 0 && p.label)
        .sort((a, b) => b.w - a.w)
        .slice(0, 2)
        .map(p => p.label!),
      candidate: c,
    });
  }
  return recs.sort((a, b) => b.score - a.score);
}

/** Stable fingerprint of what the recommendations depend on. */
export function planHash(prefs: Preferences, ctx: PlanContext): string {
  return JSON.stringify([prefs, ctx]);
}
