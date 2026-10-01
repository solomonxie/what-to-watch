const values: Record<string, unknown> = {};
jest.mock('react-native/Libraries/Settings/Settings', () => ({
  __esModule: true,
  default: { get: (key: string) => values[key] },
}));

import { storeRegion } from '../src/config/storeRegion';

describe('storeRegion', () => {
  it('defaults to us', () => {
    expect(storeRegion()).toBe('us');
    values.appStoreRegion = '';
    expect(storeRegion()).toBe('us');
  });

  it('reads cn from the build', () => {
    values.appStoreRegion = 'cn';
    expect(storeRegion()).toBe('cn');
  });
});
