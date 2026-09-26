import {
  UnsupportedImportError,
  type ImportEntry,
  type ParsedImport,
} from './types';

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m
    ? decode(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim())
    : undefined;
};

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

const items = (xml: string) => xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

export function parseLetterboxdRss(xml: string): ImportEntry[] {
  return items(xml).flatMap(item => {
    const title = tag(item, 'letterboxd:filmTitle');
    if (!title) return [];
    const rating = parseFloat(tag(item, 'letterboxd:memberRating') ?? '');
    const tmdbMovie = tag(item, 'tmdb:movieId');
    const tmdbTv = tag(item, 'tmdb:tvId');
    const watched = tag(item, 'letterboxd:watchedDate');
    return [
      {
        titles: [title],
        year: Number(tag(item, 'letterboxd:filmYear')) || undefined,
        tmdbId: tmdbTv ?? tmdbMovie,
        mediaType: tmdbTv ? 'tv' : 'movie',
        status: 'completed',
        rating: Number.isFinite(rating) ? Math.round(rating * 2) : undefined,
        date: watched ? Date.parse(watched) : undefined,
      } satisfies ImportEntry,
    ];
  });
}

const DOUBAN_RATING: Record<string, number> = {
  力荐: 10,
  推荐: 8,
  还行: 6,
  较差: 4,
  很差: 2,
};

export function parseDoubanRss(xml: string): ImportEntry[] {
  return items(xml).flatMap(item => {
    const title = tag(item, 'title') ?? '';
    const link = tag(item, 'link') ?? '';
    const m = title.match(/^(看过|想看|在看)(.+)$/);
    if (!m || !/movie\.douban\.com/.test(link)) return [];
    const desc = tag(item, 'description') ?? '';
    const rec = desc.match(/推荐:\s*(力荐|推荐|还行|较差|很差)/)?.[1];
    const pub = tag(item, 'pubDate');
    return [
      {
        titles: [m[2].trim()],
        status:
          m[1] === '想看'
            ? 'toWatch'
            : m[1] === '在看'
            ? 'watching'
            : 'completed',
        rating: rec ? DOUBAN_RATING[rec] : undefined,
        date: pub ? Date.parse(pub) : undefined,
      } satisfies ImportEntry,
    ];
  });
}

/** Accepts a profile URL, RSS URL, or "letterboxd:<user>" / "douban:<id>". */
export function feedUrlFor(input: string): { source: string; url: string } {
  const s = input.trim();
  const lb =
    s.match(/letterboxd\.com\/([^/?#\s]+)/i) ?? s.match(/^letterboxd:(\S+)$/i);
  if (lb)
    return {
      source: 'Letterboxd',
      url: `https://letterboxd.com/${lb[1]}/rss/`,
    };
  const db =
    s.match(/douban\.com\/(?:feed\/)?people\/([^/?#\s]+)/i) ??
    s.match(/^douban:(\S+)$/i);
  if (db) {
    return {
      source: 'Douban',
      url: `https://www.douban.com/feed/people/${db[1]}/interests`,
    };
  }
  throw new UnsupportedImportError(
    'Paste a Letterboxd profile (letterboxd.com/you) or Douban profile (douban.com/people/you).',
  );
}

export async function fetchFeed(input: string): Promise<ParsedImport> {
  const { source, url } = feedUrlFor(input);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 WhatToWatch' },
  });
  if (!res.ok)
    throw new Error(`${source} returned ${res.status}. Is the profile public?`);
  const xml = await res.text();
  const entries =
    source === 'Letterboxd' ? parseLetterboxdRss(xml) : parseDoubanRss(xml);
  return { source, entries };
}
