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
  /** The row is one episode (by imdbId), not a whole show. */
  episode?: boolean;
}

export interface ParsedImport {
  source: string;
  entries: ImportEntry[];
  /** Rows that aren't movies or shows (e.g. video games). */
  ignored: number;
}

export class UnsupportedImportError extends Error {}
