jest.mock('@op-engineering/op-sqlite', () => require('../test-support/nodeOpSqlite'));

import { planQueries, rankWeight, scoreCandidates, type Candidate } from '../src/recs/recommender';
import { EMPTY_PREFS, type Preferences } from '../src/prefs/prefsStore';
import { moveItem } from '../src/ui/RankedList';

const prefs = (p: Partial<Preferences>): Preferences => ({ ...EMPTY_PREFS, ...p });
const ctx = { region: 'US', providerIds: [8, 350] };

function cand(id: string, over: Partial<Candidate['details']> = {}, vote = 7): Candidate {
  return {
    details: {
      providerId: 'tmdb',
      externalId: id,
      title: `T${id}`,
      genres: [],
      mediaType: 'movie',
      ...over,
    },
    ratings: [],
    popularity: 10,
    voteAverage: vote,
  };
}

describe('rankWeight', () => {
  it('is 1 for the top item and 0.4 for the last', () => {
    expect(rankWeight(0, 5)).toBe(1);
    expect(rankWeight(4, 5)).toBeCloseTo(0.4);
    expect(rankWeight(0, 1)).toBe(1);
  });
});

describe('planQueries', () => {
  it('maps genres to per-type ids, limits to services, ORs languages', () => {
    const qs = planQueries(
      prefs({ genres: ['Science Fiction', 'Thriller'], languages: ['ko', 'ja'] }),
      ctx,
    );
    const movie = qs.filter(q => q.mediaType === 'movie');
    const tv = qs.filter(q => q.mediaType === 'tv');
    expect(movie.map(q => q.params.with_genres)).toEqual(['878', '53']);
    expect(tv.map(q => q.params.with_genres)).toEqual(['10765']); // Thriller has no tv id
    expect(movie[0].params.with_original_language).toBe('ko|ja');
    expect(movie[0].params.with_watch_providers).toBe('8|350');
  });

  it('adds tagged topic and country queries and respects media type', () => {
    const qs = planQueries(
      prefs({
        mediaTypes: 'tv',
        onlyMyServices: false,
        topics: [{ id: 4379, name: 'time travel' }],
        countries: ['KR'],
      }),
      ctx,
    );
    expect(qs.every(q => q.mediaType === 'tv')).toBe(true);
    expect(qs.map(q => q.tag?.kind)).toEqual(['topic', 'country']);
    expect(qs[0].params.with_watch_providers).toBeUndefined();
  });
});

describe('scoreCandidates', () => {
  it('ranks higher-ranked genre matches first and explains why', () => {
    const p = prefs({ genres: ['Drama', 'Comedy'], languages: ['ko'] });
    const recs = scoreCandidates(
      [
        cand('1', { genres: ['Comedy'] }),
        cand('2', { genres: ['Drama'], originalLanguage: 'ko' }),
        cand('3', { genres: ['Horror'] }),
      ],
      p,
      new Set(),
    );
    expect(recs.map(r => r.tmdbId)).toEqual(['2', '1']);
    expect(recs[0].reasons).toEqual(['Drama', 'Korean']);
  });

  it('merges duplicate candidates, keeps topic tags, excludes listed titles', () => {
    const p = prefs({ topics: [{ id: 1, name: 'heist' }] });
    const tagged = { ...cand('5'), tags: [{ kind: 'topic' as const, value: 'heist' }] };
    const recs = scoreCandidates([cand('5'), tagged, tagged], p, new Set(['movie:9']));
    expect(recs).toHaveLength(1);
    expect(recs[0].reasons).toEqual(['heist']);
    expect(scoreCandidates([tagged], p, new Set(['movie:5']))).toHaveLength(0);
  });

  it('maps tv combo genres to unified names', () => {
    const recs = scoreCandidates(
      [cand('7', { genres: ['Sci-Fi & Fantasy'], mediaType: 'tv' })],
      prefs({ genres: ['Science Fiction'] }),
      new Set(),
    );
    expect(recs[0].reasons).toEqual(['Science Fiction']);
  });
});

describe('moveItem', () => {
  it('moves an item to a new index', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });
});
