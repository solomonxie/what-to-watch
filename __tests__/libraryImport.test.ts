import { parseCsv } from '../src/libraryImport/csv';
import { parseImportCsv } from '../src/libraryImport/formats';
import { feedUrlFor, parseDoubanRss, parseLetterboxdRss } from '../src/libraryImport/rss';
import { bestMatch, matchScore, normalizeTitle } from '../src/libraryImport/matcher';
import { UnsupportedImportError } from '../src/libraryImport/types';
import type { DiscoveredTitleMeta } from '../src/providers/tmdbProvider';

describe('parseCsv', () => {
  it('handles BOM, quotes, escaped quotes and newlines in fields', () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\n\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });
});

describe('parseImportCsv', () => {
  it('refuses Goodreads/Douban book exports with a clear message', () => {
    const books =
      'Book Id,Title,Author,Original Publication Year,Year Published,ISBN13,ISBN,My Rating,My Review,Private Notes,Exclusive Shelf,Date Read,Date Added,Bookshelves\n' +
      '1,The Complete Robot,Isaac Asimov,1983,1983,9780586057247,,5,,,read,2018-03-22,2018-03-22,\n';
    expect(() => parseImportCsv(books)).toThrow(UnsupportedImportError);
    expect(() => parseImportCsv(books)).toThrow(/book export \(1 books\)/);
  });

  it('reads Douban movie exports with Chinese headers', () => {
    const csv =
      '标题,个人评分,打分日期,我的短评,上映日期,制片国家,条目链接,状态\n' +
      '肖申克的救赎 / The Shawshank Redemption,5,2020-01-02,经典,1994-09-10(多伦多电影节),美国,https://movie.douban.com/subject/1292052/,看过\n' +
      '沙丘2,,2024-03-01,,2024-03-08(中国大陆),美国,https://movie.douban.com/subject/1/,想看\n';
    const { source, entries } = parseImportCsv(csv);
    expect(source).toBe('Douban');
    expect(entries[0]).toMatchObject({
      titles: ['肖申克的救赎', 'The Shawshank Redemption'],
      year: 1994,
      status: 'completed',
      rating: 10,
      review: '经典',
    });
    expect(entries[1]).toMatchObject({ status: 'toWatch', rating: undefined });
  });

  it('reads IMDb ratings and watchlists', () => {
    const ratings =
      'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year\n' +
      'tt0111161,9,2020-01-01,The Shawshank Redemption,,url,Movie,9.3,142,1994\n' +
      'tt0903747,10,2020-01-01,Breaking Bad,,url,TV Series,9.5,49,2008\n';
    const r = parseImportCsv(ratings, 'ratings.csv').entries;
    expect(r[0]).toMatchObject({ imdbId: 'tt0111161', rating: 9, status: 'completed', mediaType: 'movie' });
    expect(r[1].mediaType).toBe('tv');
    const wl = parseImportCsv(
      'Position,Const,Created,Modified,Description,Title,URL,Title Type,Year\n1,tt1,2021-01-01,,,Dune,u,Movie,2021\n',
      'WATCHLIST.csv',
    ).entries;
    expect(wl[0].status).toBe('toWatch');
  });

  it('reads Letterboxd ratings (0.5-5 → 1-10) and watchlist by file name', () => {
    const csv = 'Date,Name,Year,Letterboxd URI,Rating\n2024-01-01,Past Lives,2023,https://boxd.it/x,4.5\n';
    expect(parseImportCsv(csv, 'ratings.csv').entries[0]).toMatchObject({
      titles: ['Past Lives'],
      rating: 9,
      status: 'completed',
    });
    const wl = 'Date,Name,Year,Letterboxd URI\n2024-01-01,Dune,2021,https://boxd.it/y\n';
    expect(parseImportCsv(wl, 'watchlist.csv').entries[0].status).toBe('toWatch');
  });

  it('rejects unknown formats', () => {
    expect(() => parseImportCsv('foo,bar\n1,2\n')).toThrow(/Unrecognised CSV/);
  });
});

describe('RSS', () => {
  it('parses Letterboxd items with TMDB ids and ratings', () => {
    const xml = `<rss><channel><item><title>Past Lives, 2023 - ★★★★½</title>
      <letterboxd:watchedDate>2024-01-05</letterboxd:watchedDate>
      <letterboxd:filmTitle>Past Lives</letterboxd:filmTitle>
      <letterboxd:filmYear>2023</letterboxd:filmYear>
      <letterboxd:memberRating>4.5</letterboxd:memberRating>
      <tmdb:movieId>666277</tmdb:movieId></item>
      <item><title>A list</title></item></channel></rss>`;
    expect(parseLetterboxdRss(xml)).toEqual([
      expect.objectContaining({ tmdbId: '666277', mediaType: 'movie', rating: 9, year: 2023 }),
    ]);
  });

  it('parses Douban movie marks and skips books', () => {
    const xml = `<rss><item><title>看过肖申克的救赎</title><link>https://movie.douban.com/subject/1292052/</link>
      <description><![CDATA[<p>推荐: 力荐</p>]]></description></item>
      <item><title>想看沙丘2</title><link>https://movie.douban.com/subject/2/</link><description></description></item>
      <item><title>读过三体</title><link>https://book.douban.com/subject/3/</link></item></rss>`;
    const entries = parseDoubanRss(xml);
    expect(entries.map(e => [e.titles[0], e.status, e.rating])).toEqual([
      ['肖申克的救赎', 'completed', 10],
      ['沙丘2', 'toWatch', undefined],
    ]);
  });

  it('builds feed URLs from profile links', () => {
    expect(feedUrlFor('https://letterboxd.com/dave/films/').url).toBe('https://letterboxd.com/dave/rss/');
    expect(feedUrlFor('https://www.douban.com/people/12345/').url).toBe(
      'https://www.douban.com/feed/people/12345/interests',
    );
    expect(() => feedUrlFor('https://example.com')).toThrow();
  });
});

describe('matcher', () => {
  const c = (title: string, date: string, originalTitle?: string): DiscoveredTitleMeta => ({
    details: {
      providerId: 'tmdb',
      externalId: title,
      title,
      originalTitle,
      releaseDate: date,
      genres: [],
      mediaType: 'movie',
    },
    ratings: [],
    popularity: 50,
    voteAverage: 8,
  });

  it('normalizes punctuation, case, width and leading articles', () => {
    expect(normalizeTitle('The Lord of the Rings: The Two Towers')).toBe(
      normalizeTitle('lord of the rings the two towers'),
    );
    expect(normalizeTitle('ＡＢＣ')).toBe('abc');
  });

  it('prefers exact title with matching year; rejects wrong-year remakes', () => {
    const entry = { titles: ['Dune'], year: 2021, status: 'completed' as const };
    const best = bestMatch(entry, [c('Dune', '1984-12-14'), c('Dune', '2021-09-15')]);
    expect(best?.details.releaseDate).toBe('2021-09-15');
    expect(matchScore(entry, c('Dune', '1984-12-14'))).toBeLessThan(0.6);
  });

  it('matches on original title (Chinese entries)', () => {
    const entry = { titles: ['霸王别姬'], year: 1993, status: 'completed' as const };
    expect(bestMatch(entry, [c('Farewell My Concubine', '1993-01-01', '霸王别姬')])).not.toBeNull();
  });
});
