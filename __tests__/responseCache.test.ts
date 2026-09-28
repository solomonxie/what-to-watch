jest.mock('@op-engineering/op-sqlite', () =>
  require('../test-support/nodeOpSqlite'),
);

import {
  cachedResponse,
  MAX_CACHED_RESPONSES,
} from '../src/db/repositories/responseCacheRepo';

const HOUR = 60 * 60 * 1000;
let now = 1_000_000;
jest.spyOn(Date, 'now').mockImplementation(() => now);

describe('response cache', () => {
  it('reuses a fresh response and reloads after the ttl', async () => {
    const load = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    expect(await cachedResponse('ttl', HOUR, load)).toBe(1);
    now += HOUR - 1;
    expect(await cachedResponse('ttl', HOUR, load)).toBe(1);
    now += 1;
    expect(await cachedResponse('ttl', HOUR, load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('serves a stale copy when reloading fails', async () => {
    await cachedResponse('stale', HOUR, async () => 'old');
    now += 2 * HOUR;
    const failing = () => Promise.reject(new Error('offline'));
    expect(await cachedResponse('stale', HOUR, failing)).toBe('old');
    await expect(cachedResponse('missing', HOUR, failing)).rejects.toThrow();
  });

  it('evicts the least recently used entries', async () => {
    for (let i = 0; i < MAX_CACHED_RESPONSES; i++) {
      now++;
      await cachedResponse(`lru:${i}`, HOUR, async () => i);
    }
    now++;
    await cachedResponse('lru:0', HOUR, async () => -1);
    now++;
    await cachedResponse('lru:new', HOUR, async () => 'new');

    const reload = jest.fn().mockResolvedValue('reloaded');
    expect(await cachedResponse('lru:0', HOUR, reload)).toBe(0);
    expect(await cachedResponse('lru:1', HOUR, reload)).toBe('reloaded');
  });
});
