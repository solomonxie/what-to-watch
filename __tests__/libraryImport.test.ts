import { parseCsv } from '../src/libraryImport/csv';
import { parseImportCsv } from '../src/libraryImport/formats';
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
    expect(source).toBe('CSV');
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

  it('rejects a file from a different source than the row chosen', () => {
    const lb = 'Date,Name,Year,Letterboxd URI,Rating\n2024-01-01,Past Lives,2023,https://boxd.it/x,4.5\n';
    expect(() => parseImportCsv(lb, 'ratings.csv', 'IMDb')).toThrow(/Letterboxd export/);
    expect(() => parseImportCsv('title\nDune\n', 'x.csv', 'IMDb')).toThrow(/isn't an IMDb export/);
    expect(parseImportCsv('title\nDune\n', 'x.csv', 'CSV').entries).toHaveLength(1);
  });

  it('skips video games and flags single episodes in IMDb exports', () => {
    const csv =
      'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year\n' +
      'tt12362188,5,2026-04-19,Tell Me Why,,u,Video Game,6.8,,2020\n' +
      'tt0959621,9,2026-04-19,Pilot,,u,TV Episode,9.0,58,2008\n' +
      'tt0111161,10,2026-04-19,The Shawshank Redemption,,u,Movie,9.3,142,1994\n';
    const p = parseImportCsv(csv, 'ratings.csv', 'IMDb');
    expect(p.ignored).toBe(1);
    expect(p.entries.map(e => !!e.episode)).toEqual([true, false]);
  });

  it('reads the generic English schema', () => {
    const csv =
      'title,year,imdb,type,status,rating,review,date\n' +
      'Past Lives,2023,,movie,watched,4.5,Lovely,2024-01-02\n' +
      'Severance,2022,tt11280740,tv,watching,,,\n' +
      'Dune,2021,,,want to watch,,,\n';
    const { source, entries } = parseImportCsv(csv);
    expect(source).toBe('CSV');
    expect(entries[0]).toMatchObject({
      titles: ['Past Lives'],
      year: 2023,
      mediaType: 'movie',
      status: 'completed',
      rating: 9,
      review: 'Lovely',
    });
    expect(entries[1]).toMatchObject({
      imdbId: 'tt11280740',
      mediaType: 'tv',
      status: 'watching',
    });
    expect(entries[2].status).toBe('toWatch');
  });

  it('rejects unknown formats', () => {
    expect(() => parseImportCsv('foo,bar\n1,2\n')).toThrow(/Unrecognised CSV/);
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

describe('season and series names', () => {
  const { seasonOf, seriesNames, remakeOf } = require('../src/libraryImport/matcher');

  it('reads the season and strips its marker', () => {
    expect(seasonOf(['葬送的芙莉莲 第二季', "Frieren: Beyond Journey's End Season 2"])).toEqual({
      season: 2,
      titles: ['葬送的芙莉莲', "Frieren: Beyond Journey's End"],
    });
    expect(seasonOf(['欢迎来到实力至上主义教室 第四季', 'Classroom of the Elite 4th Season']).season).toBe(4);
    expect(seasonOf(['无职转生Ⅲ 到了异世界就拿出真本事']).season).toBe(3);
    expect(seasonOf(['外星居民最终季']).titles).toEqual(['外星居民']);
    expect(seasonOf(['记忆月台'])).toBeNull();
  });

  it('finds the series under an arc, part or sequel number', () => {
    expect(seriesNames(['鬼灭之刃：游郭篇'])).toEqual(['鬼灭之刃']);
    expect(seriesNames(['死神 千年血战篇'])).toEqual(['死神']);
    expect(seriesNames(['龙樱2'])).toEqual(['龙樱']);
    expect(seriesNames(['拳愿阿修罗 Part.2'])).toContain('拳愿阿修罗');
    expect(seriesNames(['记忆月台'])).toEqual([]);
  });

  it('treats a trailing year as a remake of that year', () => {
    expect(remakeOf(['辛巴达历险记2013'])).toEqual({ titles: ['辛巴达历险记'], year: 2013 });
    expect(remakeOf(['记忆月台'])).toBeNull();
  });
});
