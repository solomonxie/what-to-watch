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
import { getAllUserRatings } from '../src/db/repositories/ratingsRepo';
import { addMark, getAllNotes } from '../src/db/repositories/notesRepo';
import { buildPayload, importPayload } from '../src/backup/backupService';
import { applyFilters, DEFAULT_FILTERS } from '../src/state/filterStore';
import { searchIndex } from '../src/search/titleIndex';
import { PLATFORMS } from '../src/config/platforms';
import { writePreferences, EMPTY_PREFS } from '../src/prefs/prefsStore';
import {
  readRecsCache,
  recsNeedRefresh,
  refreshRecs,
} from '../src/recs/recsService';
import { parseImportCsv } from '../src/libraryImport/formats';
import { runImport } from '../src/libraryImport/importService';
import { getWatchEntry } from '../src/db/repositories/watchHistoryRepo';

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
    expect(searchIndex(title!.castNames![0]).map(h => h.item.id)).toContain(
      'tv:108545',
    );
  });

  it('loads platform rankings and filters them', async () => {
    for (const platform of PLATFORMS) {
      const rows = await refreshPlatformRanking(
        platform,
        platform.regions?.[0] ?? 'US',
        true,
      );
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
    await addMark(id, { rating: 8.5, body: 'Great', markedAt: Date.now() });

    const payload = await buildPayload();
    expect(JSON.stringify(payload)).not.toMatch(new RegExp(keys.tmdb!));
    expect((payload.titles ?? []).map(t => t.id)).toContain(id);

    await importPayload({ ...payload, notes: [], ratings: [] });
    expect(await getAllNotes()).toHaveLength(0);
    await importPayload(payload);
    expect(await getAllNotes()).toHaveLength(1);
    expect((await getAllUserRatings())[0].rating).toBe(8.5);
  });

  it('builds, caches and invalidates recommendations from a taste profile', async () => {
    const prefs = {
      ...EMPTY_PREFS,
      genres: ['Science Fiction', 'Thriller'],
      languages: ['ko', 'en'],
      topics: [{ id: 4379, name: 'time travel' }],
      onlyMyServices: false,
    };
    await writePreferences(prefs);
    const recs = await refreshRecs(null);
    expect(recs.items.length).toBeGreaterThan(10);
    expect(recs.items.every(i => i.reasons.length > 0)).toBe(true);
    const cached = await readRecsCache(null);
    expect(cached?.items[0].id).toBe(recs.items[0].id);
    expect(await recsNeedRefresh(cached, prefs, null)).toBe(false);
    const netflix = await refreshRecs(PLATFORMS[0]);
    expect(netflix.items.length).toBeGreaterThan(0);
    expect(
      await recsNeedRefresh(
        await readRecsCache(PLATFORMS[0]),
        prefs,
        PLATFORMS[0],
      ),
    ).toBe(false);
    expect(
      await recsNeedRefresh(cached, { ...prefs, genres: ['Drama'] }, null),
    ).toBe(true);
    expect(await getTitleById(recs.items[0].id)).toBeDefined();
  });

  it('imports Douban and IMDb rows by matching TMDB', async () => {
    const douban = parseImportCsv(
      '标题,个人评分,打分日期,我的短评,上映日期,状态\n' +
        '霸王别姬,5,2020-01-02,神作,1993-01-01(中国香港),看过\n' +
        '肖申克的救赎 / The Shawshank Redemption,4,2020-01-03,,1994-09-10,看过\n' +
        '千与千寻,,2020-01-04,,2001-07-20(日本),想看\n' +
        '这部电影不存在九八七六,,,,2099,看过\n',
    );
    const imdb = parseImportCsv(
      'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year\n' +
        'tt0903747,10,2020-01-01,Breaking Bad,,u,TV Series,9.5,49,2008\n',
      'ratings.csv',
    );
    const progress: number[] = [];
    const d = await runImport(douban, done => progress.push(done));
    expect(d.imported).toBe(3);
    expect(d.unmatched.map(e => e.titles[0])).toEqual([
      '这部电影不存在九八七六',
    ]);
    expect(progress[progress.length - 1]).toBe(4);
    expect((await getWatchEntry('movie:10997'))?.status).toBe('completed'); // Farewell My Concubine
    expect((await getWatchEntry('movie:129'))?.status).toBe('toWatch'); // Spirited Away

    const i = await runImport(imdb, () => {});
    expect(i.imported).toBe(1);
    expect((await getWatchEntry('tv:1396'))?.status).toBe('completed');
    const again = await runImport(imdb, () => {});
    expect(again.skipped).toBe(1);
  });
});
