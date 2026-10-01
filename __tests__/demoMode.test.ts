jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);
jest.mock('react-native/Libraries/Settings/Settings', () => {
  const values: Record<string, unknown> = {};
  return {
    __esModule: true,
    default: {
      get: (key: string) => values[key],
      set: (patch: Record<string, unknown>) => Object.assign(values, patch),
    },
  };
});
jest.mock('react-native-keychain', () => {
  const store = new Map<string, string>();
  return {
    setGenericPassword: async (user: string, password: string, o: { service: string }) =>
      store.set(o.service, password),
    getGenericPassword: async (o: { service: string }) =>
      store.has(o.service) ? { password: store.get(o.service) } : false,
    resetGenericPassword: async (o: { service: string }) => store.delete(o.service),
  };
});
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  writeFile: jest.fn(async () => {}),
  readDir: jest.fn(async () => []),
  unlink: jest.fn(async () => {}),
}));
jest.mock('@react-native-documents/picker', () => ({}));

import RNFS from 'react-native-fs';
import { isDemo } from '../src/demo/demoMode';
import {
  demoPayload,
  resetDemoData,
  switchDataStore,
} from '../src/demo/dataStore';
import { backupNow } from '../src/backup/backupService';
import { getAllUserRatings, setUserRating } from '../src/db/repositories/ratingsRepo';
import { getAllWatchHistory } from '../src/db/repositories/watchHistoryRepo';
import { getSettings } from '../src/db/repositories/settingsRepo';
import { getApiKey, saveApiKey } from '../src/secureStorage/apiKeyStore';
import demoLibrary from '../demo/library.json';

const ratedIds = async () => (await getAllUserRatings()).map(r => r.titleId).sort();

describe('demo mode', () => {
  it('swaps in a seeded demo store and never touches the real one', async () => {
    expect(isDemo()).toBe(false);
    await setUserRating('movie:1', 8);
    await saveApiKey('tmdb', 'real-key');

    await switchDataStore(true);
    expect(isDemo()).toBe(true);
    expect(await ratedIds()).toEqual(demoLibrary.ratings.map(r => r.titleId).sort());
    expect((await getAllWatchHistory()).length).toBe(demoLibrary.watchHistory.length);
    expect((await getSettings()).enabledPlatformIds).toEqual(
      demoLibrary.settings.enabledPlatformIds,
    );

    // Demo edits and keys stay in demo; the real key is only read.
    await setUserRating('movie:2', 3);
    expect(await getApiKey('tmdb')).toBe('real-key');
    await saveApiKey('tmdb', 'demo-key');
    expect(await getApiKey('tmdb')).toBe('demo-key');

    (RNFS.writeFile as jest.Mock).mockClear();
    await backupNow();
    expect(RNFS.writeFile).not.toHaveBeenCalled();

    await switchDataStore(false);
    expect(isDemo()).toBe(false);
    expect(await ratedIds()).toEqual(['movie:1']);
    expect(await getApiKey('tmdb')).toBe('real-key');
  });

  it('resets demo data to the preset library', async () => {
    await switchDataStore(true);
    await setUserRating('movie:2', 3);
    expect(await ratedIds()).toContain('movie:2');
    await resetDemoData();
    expect(await ratedIds()).not.toContain('movie:2');
    await switchDataStore(false);
  });

  it('dates the preset library as if used up to today', () => {
    const now = Date.parse('2027-03-01T12:00:00Z');
    const latest = Math.max(...demoPayload(now).watchHistory.map(h => h.watchedAt));
    expect(latest).toBeLessThanOrEqual(now);
    expect(now - latest).toBeLessThan(3 * 24 * 60 * 60 * 1000);
  });
});
