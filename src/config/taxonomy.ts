import type { AgeGroup, TitleKind } from '../types/domain';

export interface GenreDef {
  name: string;
  movie?: number;
  tv?: number;
}

// Unified genre list mapped to TMDB's separate movie/tv genre ids.
// TMDB tv has no Thriller genre; its thrillers are filed under Mystery.
export const GENRES: GenreDef[] = [
  { name: 'Action', movie: 28, tv: 10759 },
  { name: 'Adventure', movie: 12, tv: 10759 },
  { name: 'Animation', movie: 16, tv: 16 },
  { name: 'Comedy', movie: 35, tv: 35 },
  { name: 'Crime', movie: 80, tv: 80 },
  { name: 'Documentary', movie: 99, tv: 99 },
  { name: 'Drama', movie: 18, tv: 18 },
  { name: 'Family', movie: 10751, tv: 10751 },
  { name: 'Fantasy', movie: 14, tv: 10765 },
  { name: 'History', movie: 36 },
  { name: 'Horror', movie: 27 },
  { name: 'Kids', tv: 10762 },
  { name: 'Music', movie: 10402 },
  { name: 'Mystery', movie: 9648, tv: 9648 },
  { name: 'Reality', tv: 10764 },
  { name: 'Romance', movie: 10749 },
  { name: 'Science Fiction', movie: 878, tv: 10765 },
  { name: 'Thriller', movie: 53, tv: 9648 },
  { name: 'War', movie: 10752, tv: 10768 },
  { name: 'Western', movie: 37, tv: 37 },
];

export const LANGUAGES: [string, string][] = [
  ['en', 'English'],
  ['ko', 'Korean'],
  ['ja', 'Japanese'],
  ['zh', 'Chinese'],
  ['cn', 'Cantonese'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['hi', 'Hindi'],
  ['sv', 'Swedish'],
  ['da', 'Danish'],
  ['no', 'Norwegian'],
  ['tr', 'Turkish'],
  ['th', 'Thai'],
  ['ru', 'Russian'],
  ['pl', 'Polish'],
];

export const COUNTRIES: [string, string][] = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['KR', 'South Korea'],
  ['JP', 'Japan'],
  ['CN', 'China'],
  ['HK', 'Hong Kong'],
  ['TW', 'Taiwan'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['IN', 'India'],
  ['MX', 'Mexico'],
  ['BR', 'Brazil'],
  ['SE', 'Sweden'],
  ['DK', 'Denmark'],
  ['NO', 'Norway'],
  ['TR', 'Turkey'],
];

export const languageName = (code: string) =>
  LANGUAGES.find(([c]) => c === code)?.[1] ?? code.toUpperCase();
export const countryName = (code: string) =>
  COUNTRIES.find(([c]) => c === code)?.[1] ?? code;

/** Genre names TMDB returns (incl. tv-only combos) → unified name(s). */
export function unifiedGenres(tmdbName: string): string[] {
  switch (tmdbName) {
    case 'Action & Adventure':
      return ['Action', 'Adventure'];
    case 'Sci-Fi & Fantasy':
      return ['Science Fiction', 'Fantasy'];
    case 'War & Politics':
      return ['War'];
    default:
      return [tmdbName];
  }
}

const TMDB_TV_GENRE_IDS: Record<string, number> = {
  'Action & Adventure': 10759,
  'Sci-Fi & Fantasy': 10765,
  'War & Politics': 10768,
};

function genreId(name: string, mediaType?: string): number | undefined {
  const kind = mediaType === 'tv' ? 'tv' : 'movie';
  return (
    GENRES.find(g => g.name === name)?.[kind] ??
    (kind === 'tv' ? TMDB_TV_GENRE_IDS[name] : undefined)
  );
}

/** By TMDB genre id for the title's type, so tv "Sci-Fi & Fantasy" is Science Fiction and tv Mystery is Thriller. */
export function hasGenre(
  wanted: string,
  genres: string[],
  mediaType?: string,
): boolean {
  if (genres.includes(wanted)) return true;
  const id = genreId(wanted, mediaType);
  return id !== undefined && genres.some(g => genreId(g, mediaType) === id);
}

export const KINDS: { value: TitleKind; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'series', label: 'Series' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'docuseries', label: 'Docuseries' },
  { value: 'unscripted', label: 'Reality & talk' },
  { value: 'animation', label: 'Animation' },
  { value: 'anime', label: 'Anime' },
];

export const AGES: { value: AgeGroup; label: string }[] = [
  { value: 'adults', label: 'Adults 17+' },
  { value: 'teens', label: 'Teens 13–16' },
  { value: 'children', label: '7–12' },
  { value: 'kids', label: 'Kids 0–6' },
  { value: 'family', label: 'Family' },
];
