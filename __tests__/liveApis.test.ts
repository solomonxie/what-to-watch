/**
 * Opt-in: hits real TMDB/OMDb. Keys from env or .env.local:
 *   npx jest __tests__/liveApis.test.ts
 */
jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);
jest.mock('../src/secureStorage/apiKeyStore', () => ({
  getApiKey: async (id: 'tmdb' | 'omdb') =>
    require('../test-support/liveKeys')[id] ?? null,
}));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  writeFile: jest.fn(async () => {}),
  readDir: jest.fn(async () => []),
  unlink: jest.fn(async () => {}),
}));
jest.mock('@react-native-documents/picker', () => ({}));

import {
  fetchAndCacheTitle,
  refreshPlatformRanking,
  searchOnline,
} from '../src/catalog/catalogService';
import {
  getTitleById,
  getWatchProvidersForTitle,
  getRatingsForTitle,
} from '../src/db/repositories/titlesRepo';
import { getSettings } from '../src/db/repositories/settingsRepo';
import {
  getWatchCounts,
  recordWatch,
} from '../src/db/repositories/watchHistoryRepo';
import {
  setUserRating,
  getAllUserRatings,
} from '../src/db/repositories/ratingsRepo';
import { addNote, getAllNotes } from '../src/db/repositories/notesRepo';
import { buildPayload, importPayload } from '../src/backup/backupService';
import { applyFilters, DEFAULT_FILTERS } from '../src/state/filterStore';
import { searchIndex } from '../src/search/fuseIndex';
import { PLATFORMS } from '../src/config/platforms';

const keys: {
  tmdb: string | null;
  omdb: string | null;
} = require('../test-support/liveKeys');

const live = keys.tmdb ? describe : describe.skip;
jest.setTimeout(60000);

live('live TMDB/OMDb end to end', () => {
  let threeBodyIds: string[] = [];

  it('creates default settings', async () => {
    const s = await getSettings();
    expect(s.enabledPlatformIds.length).toBeGreaterThan(0);
  });

  it('searches online and caches every top result', async () => {
    const results = await searchOnline('Three body');
    expect(results.length).toBeGreaterThan(3);
    const failures: string[] = [];
    for (const r of results.slice(0, 8)) {
      try {
        threeBodyIds.push(
          await fetchAndCacheTitle(r.externalId, r.mediaType, 'US'),
        );
      } catch (e) {
        failures.push(`${r.title} (${r.mediaType}:${r.externalId}): ${e}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('stores facets, ratings and availability for a cached title', async () => {
    const title = await getTitleById('tv:108545'); // 3 Body Problem (Netflix)
    expect(title?.castNames?.length).toBeGreaterThan(0);
    expect(title?.originalLanguage).toBe('en');
    expect(title?.originCountries?.length).toBeGreaterThan(0);
    const ratings = await getRatingsForTitle('tv:108545');
    expect(ratings.map(r => r.source)).toContain('tmdb');
    if (keys.omdb) expect(ratings.map(r => r.source)).toContain('imdb');
    const providers = await getWatchProvidersForTitle('tv:108545');
    expect(providers.map(p => p.platformName).join()).toMatch(/Netflix/);
  });

  it('indexes cached titles for local search, including cast', async () => {
    expect(searchIndex('three body').length).toBeGreaterThan(0);
    const title = await getTitleById('tv:108545');
    expect(searchIndex(title!.castNames![0]).map(t => t.id)).toContain(
      'tv:108545',
    );
  });

  it('loads platform rankings and filters them', async () => {
    for (const platform of PLATFORMS) {
      const rows = await refreshPlatformRanking(platform, 'US', true);
      expect(rows.length).toBeGreaterThan(5);
    }
    const rows = await refreshPlatformRanking(PLATFORMS[0], 'US');
    const items = rows.map(r => ({ title: r.title, watchCount: 0 }));
    const english = applyFilters(items, {
      ...DEFAULT_FILTERS,
      languages: ['en'],
    });
    expect(english.length).toBeGreaterThan(0);
    expect(english.length).toBeLessThanOrEqual(items.length);
    const tv = applyFilters(items, {
      ...DEFAULT_FILTERS,
      ratingRange: [60, 100],
    });
    expect(tv.every(i => (i.title.primaryRatingScore ?? 0) >= 60)).toBe(true);
  });

  it('records personal data and round-trips it through backup', async () => {
    const id = threeBodyIds[0];
    await recordWatch(id, 'completed');
    await recordWatch(id, 'completed');
    expect((await getWatchCounts()).get(id)).toBe(2);
    await setUserRating(id, 8.5, 'Great');
    await addNote(id, 'Watch with subtitles');

    const payload = await buildPayload();
    expect(JSON.stringify(payload)).not.toMatch(new RegExp(keys.tmdb!));
    expect((payload.titles ?? []).map(t => t.id)).toContain(id);

    await importPayload({ ...payload, notes: [], ratings: [] });
    expect(await getAllNotes()).toHaveLength(0);
    await importPayload(payload);
    expect(await getAllNotes()).toHaveLength(1);
    expect((await getAllUserRatings())[0].rating).toBe(8.5);
  });
});
