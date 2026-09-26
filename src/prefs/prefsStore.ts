import { create } from 'zustand';
import { getKv, setKv } from '../db/repositories/kvRepo';

export interface Topic {
  id: number;
  name: string;
}

export interface Preferences {
  genres: string[];
  topics: Topic[];
  languages: string[];
  countries: string[];
  mediaTypes: 'both' | 'movie' | 'tv';
  onlyMyServices: boolean;
}

export type Facet = 'genres' | 'topics' | 'languages' | 'countries';

export const EMPTY_PREFS: Preferences = {
  genres: [],
  topics: [],
  languages: [],
  countries: [],
  mediaTypes: 'both',
  onlyMyServices: true,
};

export const PREFS_KEY = 'preferences';

export function hasTaste(p: Preferences): boolean {
  return (
    p.genres.length +
      p.topics.length +
      p.languages.length +
      p.countries.length >
    0
  );
}

export async function readPreferences(): Promise<Preferences> {
  const raw = await getKv(PREFS_KEY);
  return raw ? { ...EMPTY_PREFS, ...JSON.parse(raw) } : EMPTY_PREFS;
}

export async function writePreferences(p: Preferences): Promise<void> {
  await setKv(PREFS_KEY, JSON.stringify(p));
}

interface PrefsStore {
  prefs: Preferences | null;
  load: () => Promise<Preferences>;
  update: (patch: Partial<Preferences>) => Promise<void>;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: null,
  load: async () => {
    const prefs = await readPreferences();
    set({ prefs });
    return prefs;
  },
  update: async patch => {
    const prefs = { ...(get().prefs ?? (await readPreferences())), ...patch };
    set({ prefs });
    await writePreferences(prefs);
  },
}));
