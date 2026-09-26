import Fuse, { type IFuseOptions } from 'fuse.js';

export interface SearchableTitle {
  id: string;
  title: string;
  originalTitle?: string | null;
  genres: string[];
  castNames?: string[] | null;
  posterPath?: string | null;
  releaseDate?: string | null;
  mediaType?: string;
  primaryRatingScore?: number | null;
}

let fuse: Fuse<SearchableTitle> | null = null;

const OPTIONS: IFuseOptions<SearchableTitle> = {
  keys: ['title', 'originalTitle', 'genres', 'castNames'],
  threshold: 0.35,
  ignoreLocation: true,
};

export function buildSearchIndex(titles: SearchableTitle[]): void {
  fuse = new Fuse(titles, OPTIONS);
}

export function searchIndex(query: string): SearchableTitle[] {
  if (!fuse || !query.trim()) return [];
  return fuse.search(query).map(result => result.item);
}
