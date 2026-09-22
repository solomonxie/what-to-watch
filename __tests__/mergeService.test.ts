import { mergeTitleDetails } from '../src/providers/mergeService';
import type { ProviderRating, ProviderTitleDetails } from '../src/types/domain';

describe('mergeTitleDetails', () => {
  it('prefers TMDB fields over OMDb when both are present', () => {
    const tmdb: ProviderTitleDetails = {
      providerId: 'tmdb',
      externalId: '123',
      tmdbId: '123',
      title: 'TMDB Title',
      overview: 'TMDB overview',
      genres: ['Action'],
      mediaType: 'movie',
    };
    const omdb: ProviderTitleDetails = {
      providerId: 'omdb',
      externalId: 'tt000123',
      omdbId: 'tt000123',
      title: 'OMDb Title',
      overview: 'OMDb overview',
      genres: ['Drama'],
      mediaType: 'movie',
    };

    const merged = mergeTitleDetails([omdb, tmdb]);

    expect(merged.title).toBe('TMDB Title');
    expect(merged.overview).toBe('TMDB overview');
    expect(merged.id).toBe('123');
    expect(merged.genres.sort()).toEqual(['Action', 'Drama']);
  });

  it('falls back to OMDb fields when TMDB is missing a value', () => {
    const tmdb: ProviderTitleDetails = {
      providerId: 'tmdb',
      externalId: '123',
      tmdbId: '123',
      title: 'TMDB Title',
      genres: [],
      mediaType: 'movie',
    };
    const omdb: ProviderTitleDetails = {
      providerId: 'omdb',
      externalId: 'tt000123',
      omdbId: 'tt000123',
      title: 'OMDb Title',
      overview: 'OMDb overview',
      genres: [],
      mediaType: 'movie',
    };

    const merged = mergeTitleDetails([tmdb, omdb]);

    expect(merged.overview).toBe('OMDb overview');
  });

  it('computes an averaged primaryRatingScore from normalized ratings', () => {
    const tmdb: ProviderTitleDetails = {
      providerId: 'tmdb',
      externalId: '123',
      tmdbId: '123',
      title: 'TMDB Title',
      genres: [],
      mediaType: 'movie',
    };
    const ratings: ProviderRating[] = [
      { source: 'tmdb', rawValue: 8, scale: '0-10', normalizedValue: 80 },
      { source: 'rotten_tomatoes', rawValue: 90, scale: 'percent', normalizedValue: 90 },
    ];

    const merged = mergeTitleDetails([tmdb], ratings);

    expect(merged.primaryRatingScore).toBe(85);
  });

  it('throws when given no provider results', () => {
    expect(() => mergeTitleDetails([])).toThrow();
  });
});
