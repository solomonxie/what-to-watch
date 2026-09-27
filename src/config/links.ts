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

export function tmdbUrl(mediaType: string, tmdbId: string) {
  return `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
}

// Douban has no public API; its search resolves an IMDb id to the exact subject.
function doubanSearchUrl(query: string) {
  return `https://m.douban.com/search/?query=${encodeURIComponent(
    query,
  )}&type=movie`;
}

async function findDoubanSubject(query: string) {
  try {
    const res = await fetch(doubanSearchUrl(query));
    const found = (await res.text()).match(/\/movie\/subject\/(\d+)/);
    return found?.[1] ?? null;
  } catch {
    return null;
  }
}

const doubanUrls = new Map<string, Promise<string>>();

async function resolveDoubanUrl(query: string) {
  const subject = await findDoubanSubject(query);
  if (!subject) return doubanSearchUrl(query);
  const app = `douban://douban.com/movie/${subject}`;
  if (await Linking.canOpenURL(app).catch(() => false)) return app;
  return `https://m.douban.com/movie/subject/${subject}/`;
}

/**
 * Douban app if installed, else its mobile page, else its search.
 * Cached per title; call early so a tap doesn't wait on the lookup.
 */
export function doubanUrl(
  imdbId: string | null | undefined,
  title: string,
  year?: string,
): Promise<string> {
  const query = imdbId ?? `${title} ${year ?? ''}`.trim();
  let url = doubanUrls.get(query);
  if (!url) {
    url = resolveDoubanUrl(query);
    doubanUrls.set(query, url);
    // A miss may be the network; look again next time.
    url.then(u => u === doubanSearchUrl(query) && doubanUrls.delete(query));
  }
  return url;
}
