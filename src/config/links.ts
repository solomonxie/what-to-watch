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
