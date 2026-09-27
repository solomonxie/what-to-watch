import { parseCsv } from './csv';
import {
  UnsupportedImportError,
  type ImportEntry,
  type ImportStatus,
  type ParsedImport,
} from './types';
import type { MediaType } from '../types/domain';

type Row = Record<string, string>;

const num = (v?: string) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : undefined;
};
const yearOf = (v?: string) => {
  const m = v?.match(/(18|19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
};
const dateOf = (v?: string) => {
  const t = v ? Date.parse(v.trim().replace(' ', 'T')) : NaN;
  return Number.isFinite(t) ? t : undefined;
};
const pick = (row: Row, ...keys: string[]) => {
  for (const k of keys) if (row[k]?.trim()) return row[k].trim();
  return undefined;
};
/** "肖申克的救赎 / The Shawshank Redemption" → both, in order. */
const splitTitles = (v: string) =>
  v
    .split(/\s+\/\s+/)
    .map(s => s.trim())
    .filter(Boolean);
const clampRating = (r?: number) =>
  r && r > 0 ? Math.min(10, Math.max(1, Math.round(r))) : undefined;

function imdbType(t?: string): MediaType | undefined {
  if (!t) return undefined;
  return /tv|series|episode/i.test(t) ? 'tv' : 'movie';
}

function shelfStatus(v?: string): ImportStatus {
  const s = (v ?? '').toLowerCase();
  if (/想看|to-?(watch|read|see)|want|wish|plan/.test(s)) return 'toWatch';
  if (/在看|currently|watching|reading|doing/.test(s)) return 'watching';
  return 'completed';
}

/** Accepted headers per field, English first; the Chinese ones are Douban's. */
const COLUMNS = {
  title: ['title', 'Title', 'Name', '标题', '电影名', '片名', '名称'],
  year: ['year', 'Year', 'release_date', '上映日期', '年份', '年代'],
  imdb: ['imdb', 'IMDb', 'imdb_id', 'IMDb链接'],
  type: ['type', 'Type', 'media_type'],
  status: ['status', 'Status', 'Exclusive Shelf', '状态', '类型', '标记'],
  rating: ['rating', 'Rating', 'My Rating', '个人评分', '我的评分', '评分'],
  review: ['review', 'Review', 'My Review', '我的短评', '短评', '评论'],
  date: ['date', 'Date', 'Date Read', 'Date Added', '打分日期', '标记日期', '日期', '时间'],
};

/** What a CSV needs for the generic import, for display. */
export const CSV_COLUMNS = [
  'title — required; "Chinese / Original" gives both',
  'year',
  'imdb — tt… id or IMDb link',
  'type — movie or tv',
  'status — watched, watching or want to watch',
  'rating — 0.5 to 5 stars',
  'review',
  'date',
];

interface Format {
  name: string;
  matches: (headers: string[]) => boolean;
  map: (row: Row, fileName: string) => ImportEntry | null;
}

const FORMATS: Format[] = [
  {
    name: 'IMDb',
    matches: h => h.includes('Const') && h.includes('Title'),
    map: (row, fileName) => {
      const rating = clampRating(num(row['Your Rating']));
      const watchlist =
        /watchlist/i.test(fileName) || (!rating && !('Your Rating' in row));
      return {
        titles: [row.Title, row['Original Title']].filter(Boolean),
        year: yearOf(row.Year),
        imdbId: row.Const,
        mediaType: imdbType(row['Title Type']),
        status: watchlist ? 'toWatch' : 'completed',
        rating,
        date: dateOf(pick(row, 'Date Rated', 'Created')),
      };
    },
  },
  {
    name: 'Letterboxd',
    matches: h => h.includes('Name') && h.includes('Letterboxd URI'),
    map: (row, fileName) => ({
      titles: [row.Name],
      year: yearOf(row.Year),
      mediaType: 'movie',
      status: /watchlist/i.test(fileName) ? 'toWatch' : 'completed',
      rating: clampRating((num(row.Rating) ?? 0) * 2),
      review: row.Review || undefined,
      date: dateOf(pick(row, 'Watched Date', 'Date')),
    }),
  },
  {
    // Generic schema; see CSV_COLUMNS. Douban exports use these headers.
    name: 'CSV',
    matches: h => h.some(x => COLUMNS.title.includes(x)),
    map: row => {
      const title = pick(row, ...COLUMNS.title);
      if (!title) return null;
      const type = pick(row, ...COLUMNS.type);
      return {
        titles: splitTitles(title),
        year: yearOf(pick(row, ...COLUMNS.year)),
        imdbId: pick(row, ...COLUMNS.imdb)?.match(/tt\d+/)?.[0],
        mediaType: type ? imdbType(type) : undefined,
        status: shelfStatus(pick(row, ...COLUMNS.status)),
        rating: clampRating((num(pick(row, ...COLUMNS.rating)) ?? 0) * 2),
        review: pick(row, ...COLUMNS.review),
        date: dateOf(pick(row, ...COLUMNS.date)),
      };
    },
  },
];

function isBookExport(headers: string[]): boolean {
  return headers.some(h => /^(ISBN13?|Book Id|Author|作者)$/i.test(h));
}

export function parseImportCsv(text: string, fileName = ''): ParsedImport {
  const rows = parseCsv(text);
  if (rows.length < 2)
    throw new UnsupportedImportError('The file has no rows.');
  const headers = rows[0].map(h => h.trim());
  if (isBookExport(headers)) {
    throw new UnsupportedImportError(
      `This is a book export (${
        rows.length - 1
      } books). What to Watch imports movies and shows — export your movie and TV list instead.`,
    );
  }
  const format = FORMATS.find(f => f.matches(headers));
  if (!format) {
    throw new UnsupportedImportError(
      'Unrecognised CSV: it needs a title column. IMDb and Letterboxd exports also work as-is.',
    );
  }
  const entries = rows
    .slice(1)
    .map(cells =>
      format.map(
        Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])),
        fileName,
      ),
    )
    .filter((e): e is ImportEntry => !!e && e.titles.length > 0);
  return { source: format.name, entries };
}
