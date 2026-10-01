import {
  buildSearchIndex,
  mergeResults,
  normalize,
  searchIndex,
  titleScore,
  type SearchableTitle,
} from '../src/search/titleIndex';
import type { ProviderSearchResult } from '../src/types/domain';

const title = (id: string, name: string, extra: Partial<SearchableTitle> = {}): SearchableTitle => ({
  id,
  title: name,
  genres: [],
  mediaType: id.split(':')[0],
  ...extra,
});

const tmdb = (id: string, name: string, mediaType: 'movie' | 'tv' = 'tv'): ProviderSearchResult => ({
  providerId: 'tmdb',
  externalId: id,
  title: name,
  mediaType,
});

describe('titleScore', () => {
  it('ranks exact over prefix over word over substring', () => {
    const q = normalize('Medusa');
    const scores = ['Medusa', 'Medusa Deluxe', 'Medusas', 'The Medusa Touch', 'Ammedusa'].map(n =>
      titleScore(q, normalize(n)),
    );
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(scores.length);
  });

  it('ignores case, accents and punctuation', () => {
    expect(titleScore(normalize('amelie'), normalize('Amélie'))).toBe(100);
    expect(titleScore(normalize('spider man'), normalize('Spider-Man'))).toBe(100);
  });
});

describe('searchIndex', () => {
  beforeEach(() =>
    buildSearchIndex([
      title('movie:1', 'Medusa Deluxe'),
      title('tv:2', 'Snake Island', { castNames: ['Ana Medusa'] }),
      title('movie:3', 'Clash of the Titans'),
    ]),
  );

  it('finds title matches before cast matches', () => {
    expect(searchIndex('medusa').map(h => h.item.id)).toEqual(['movie:1', 'tv:2']);
  });

  it('falls back to fuzzy matching for typos', () => {
    expect(searchIndex('clsh of the titns').map(h => h.item.id)).toEqual(['movie:3']);
  });
});

describe('mergeResults', () => {
  it('puts the best match for "Medusa" first, ahead of a weaker library match', () => {
    buildSearchIndex([title('movie:1', 'Medusa Deluxe')]);
    const local = searchIndex('Medusa');
    const rows = mergeResults(
      'Medusa',
      local,
      [tmdb('5', 'Medusa'), tmdb('1', 'Medusa Deluxe', 'movie'), tmdb('7', 'Medusa\'s Head', 'movie')],
      new Set(['movie:1']),
    );
    expect(rows.map(r => r.key)).toEqual(['tv:5', 'movie:1', 'movie:7']);
    expect(rows[1]).toMatchObject({ cached: true, inLibrary: true });
    expect(rows[0]).toMatchObject({ cached: false, inLibrary: false });
  });

  it('lets library membership break a tie only', () => {
    const rows = mergeResults(
      'Medusa',
      [],
      [tmdb('1', 'Medusa'), tmdb('2', 'Medusa', 'movie')],
      new Set(['movie:2']),
    );
    expect(rows.map(r => r.key)).toEqual(['movie:2', 'tv:1']);
  });

  it('keeps TMDB order among equally good matches', () => {
    const rows = mergeResults('dark', [], [tmdb('1', 'Dark'), tmdb('2', 'Dark', 'movie')], new Set());
    expect(rows.map(r => r.key)).toEqual(['tv:1', 'movie:2']);
  });
});
