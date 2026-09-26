export interface GenreDef {
  name: string;
  movie?: number;
  tv?: number;
}

// Unified genre list mapped to TMDB's separate movie/tv genre ids.
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
  { name: 'Thriller', movie: 53 },
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
