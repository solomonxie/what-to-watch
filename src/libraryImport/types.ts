import type { MediaType } from '../types/domain';

export type ImportStatus = 'completed' | 'toWatch' | 'watching';

export interface ImportEntry {
  /** Alternative titles to try, best first (e.g. Chinese + original). */
  titles: string[];
  year?: number;
  imdbId?: string;
  tmdbId?: string;
  mediaType?: MediaType;
  status: ImportStatus;
  /** 1-10 */
  rating?: number;
  review?: string;
  date?: number;
}

export interface ParsedImport {
  source: string;
  entries: ImportEntry[];
}

export class UnsupportedImportError extends Error {}
