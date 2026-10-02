import { Linking } from 'react-native';

// TMDB doesn't expose platform-native title ids, so streaming links open the
// platform's own search for the title (universal links hand off to the app).
const PLATFORM_SEARCH: Record<string, (q: string) => string> = {
  '8': q => `https://www.netflix.com/search?q=${q}`,
  '9': q => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  '119': q => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  '337': q => `https://www.disneyplus.com/search?q=${q}`,
  '350': q => `https://tv.apple.com/search?term=${q}`,
  '2': q => `https://tv.apple.com/search?term=${q}`,
  '1899': q => `https://play.max.com/search?q=${q}`,
  '15': q => `https://www.hulu.com/search?q=${q}`,
  '230': q => `https://www.crave.ca/en/search?q=${q}`,
  '531': q => `https://www.paramountplus.com/search/?q=${q}`,
  '386': q => `https://www.peacocktv.com/search?q=${q}`,
};

export function platformUrl(
  providerId: string,
  title: string,
  fallback?: string | null,
) {
  const build = PLATFORM_SEARCH[providerId];
  if (build) return build(encodeURIComponent(title));
  return fallback ?? null;
}

export function imdbUrl(imdbId: string) {
  return `https://www.imdb.com/title/${imdbId}/`;
}

export function imdbSearchUrl(title: string, mediaType: string, year?: string) {
  const q = encodeURIComponent(`${title} ${year ?? ''}`.trim());
  const type = mediaType === 'tv' ? 'tv' : 'ft';
  return `https://www.imdb.com/find/?q=${q}&s=tt&ttype=${type}`;
}

export function youtubeSearchUrl(
  title: string,
  mediaType: string,
  year?: string,
) {
  const kind = mediaType === 'tv' ? 'TV series' : 'movie';
  const q = encodeURIComponent(
    `${title} ${year ?? ''} ${kind}`.replace(/\s+/g, ' '),
  );
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function tmdbUrl(mediaType: string, tmdbId: string) {
  return `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
}

/** Safari even when an installed app claims the link (iOS 17+). */
export function openInSafari(url: string) {
  return Linking.openURL(url.replace(/^https:\/\//, 'x-safari-https://')).catch(
    () => Linking.openURL(url),
  );
}

// Douban has no public API; its search resolves an IMDb id to the exact subject.
function doubanSearchUrl(query: string) {
  return `https://m.douban.com/search/?query=${encodeURIComponent(
    query,
  )}&type=movie`;
}

const LOOKUP_TIMEOUT_MS = 4000;

async function findDoubanSubject(query: string) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(doubanSearchUrl(query), { signal: abort.signal });
    const found = (await res.text()).match(/\/movie\/subject\/(\d+)/);
    return found?.[1] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const doubanQuery = (
  imdbId: string | null | undefined,
  title: string,
  year?: string,
) => imdbId ?? `${title} ${year ?? ''}`.trim();

const doubanSubjects = new Map<string, string>();
const doubanLookups = new Set<string>();

/** Looks up the title's Douban page ahead of a tap; call when the page opens. */
export function prefetchDouban(
  imdbId: string | null | undefined,
  title: string,
  year?: string,
) {
  const query = doubanQuery(imdbId, title, year);
  if (doubanSubjects.has(query) || doubanLookups.has(query)) return;
  doubanLookups.add(query);
  findDoubanSubject(query).then(subject => {
    doubanLookups.delete(query);
    if (subject)
      doubanSubjects.set(
        query,
        `https://m.douban.com/movie/subject/${subject}/`,
      );
  });
}

/** Douban's page for the title if already found, else its search, in Safari. */
export function openDouban(
  imdbId: string | null | undefined,
  title: string,
  year?: string,
) {
  const query = doubanQuery(imdbId, title, year);
  return openInSafari(doubanSubjects.get(query) ?? doubanSearchUrl(query));
}
