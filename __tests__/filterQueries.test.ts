import { filterQueries, hasServerFilters } from '../src/catalog/filterQueries';
import { DEFAULT_FILTERS } from '../src/state/filterStore';

const ctx = { region: 'US', providerIds: [8, 350] };

describe('filterQueries', () => {
  it('asks TMDB for English series thrillers rated 7+ on my services', () => {
    const queries = filterQueries(
      {
        ...DEFAULT_FILTERS,
        kinds: ['series'],
        genres: ['Thriller'],
        languages: ['en'],
        ratingRange: [70, 100],
      },
      ctx,
    );
    expect(queries).toEqual([
      {
        mediaType: 'tv',
        params: {
          watch_region: 'US',
          with_watch_providers: '8|350',
          with_watch_monetization_types: 'flatrate',
          with_genres: '9648',
          without_genres: '99,10764,10767,10763,16',
          with_original_language: 'en',
          'vote_average.gte': '7',
          'vote_count.gte': '20',
        },
      },
    ]);
  });

  it('asks TMDB for US ratings matching the age groups, per type', () => {
    const queries = filterQueries(
      { ...DEFAULT_FILTERS, ages: ['adults', 'teens'] },
      ctx,
    );
    expect(
      queries.map(q => [
        q.mediaType,
        q.params.certification_country,
        q.params.certification,
      ]),
    ).toEqual([
      ['movie', 'US', 'R|NC-17|PG-13'],
      ['tv', 'US', 'TV-MA|TV-14'],
    ]);
  });

  it('ANDs content ratings with age groups and skips a type with none', () => {
    const queries = filterQueries(
      {
        ...DEFAULT_FILTERS,
        ages: ['adults', 'teens'],
        certifications: ['R', 'NC-17', 'PG'],
      },
      ctx,
    );
    expect(queries.map(q => [q.mediaType, q.params.certification])).toEqual([
      ['movie', 'R|NC-17'],
    ]);
  });

  it('asks for animation in both types, Japanese for anime', () => {
    const anime = filterQueries(
      { ...DEFAULT_FILTERS, kinds: ['anime'], genres: ['Action'] },
      ctx,
    );
    expect(
      anime.map(q => [
        q.mediaType,
        q.params.with_genres,
        q.params.with_original_language,
      ]),
    ).toEqual([
      ['movie', '16,28', 'ja'],
      ['tv', '16,10759', 'ja'],
    ]);
    expect(
      filterQueries(
        { ...DEFAULT_FILTERS, kinds: ['anime'], languages: ['ko'] },
        ctx,
      ),
    ).toEqual([]);
    const mixed = filterQueries(
      { ...DEFAULT_FILTERS, kinds: ['series', 'animation'] },
      ctx,
    );
    expect(mixed.map(q => [q.mediaType, q.params.with_genres])).toEqual([
      ['movie', '16'],
      ['tv', undefined],
    ]);
  });

  it('ORs genres per type and skips a type none of them exist for', () => {
    const both = filterQueries(
      { ...DEFAULT_FILTERS, genres: ['Action', 'Science Fiction'] },
      ctx,
    );
    expect(both.map(q => [q.mediaType, q.params.with_genres])).toEqual([
      ['movie', '28|878'],
      ['tv', '10759|10765'],
    ]);
    const horror = filterQueries(
      { ...DEFAULT_FILTERS, genres: ['Horror'] },
      ctx,
    );
    expect(horror.map(q => q.mediaType)).toEqual(['movie']);
  });

  it('maps years to each type’s date field and countries to origin', () => {
    const [movie, tv] = filterQueries(
      { ...DEFAULT_FILTERS, yearRange: [2010, 2019], regions: ['KR', 'JP'] },
      { region: 'US', providerIds: [] },
    );
    expect(movie.params).toEqual({
      'primary_release_date.gte': '2010-01-01',
      'primary_release_date.lte': '2019-12-31',
      with_origin_country: 'KR|JP',
    });
    expect(tv.params['first_air_date.gte']).toBe('2010-01-01');
  });

  it('only runs for filters TMDB can apply', () => {
    expect(hasServerFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasServerFilters({ ...DEFAULT_FILTERS, cast: ['x'] })).toBe(false);
    expect(hasServerFilters({ ...DEFAULT_FILTERS, languages: ['en'] })).toBe(
      true,
    );
  });
});
