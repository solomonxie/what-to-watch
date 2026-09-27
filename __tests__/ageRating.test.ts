import {
  matchesAgeGroup,
  minAge,
  pickCertification,
} from '../src/catalog/ageRating';

describe('minAge', () => {
  it.each([
    ['G', 0],
    ['TV-Y', 0],
    ['TV-Y7', 7],
    ['PG', 8],
    ['TV-PG', 8],
    ['PG-13', 13],
    ['TV-14', 14],
    ['15', 15],
    ['MA15+', 15],
    ['R', 17],
    ['TV-MA', 17],
    ['18', 18],
  ])('%s → %i', (cert, age) => expect(minAge(cert)).toBe(age));

  it('is unknown for NR and empty', () => {
    expect(minAge('NR')).toBeUndefined();
    expect(minAge('')).toBeUndefined();
  });
});

describe('pickCertification', () => {
  const entries = [
    { country: 'KR', certification: '15' },
    { country: 'US', certification: '' },
    { country: 'GB', certification: '12A' },
  ];
  it('skips blank US and prefers the user region', () => {
    expect(pickCertification(entries, 'KR')).toBe('15');
    expect(pickCertification(entries, 'DE')).toBe('12A');
  });
  it('returns empty when nothing is usable', () => {
    expect(pickCertification([], 'US')).toBe('');
  });
});

describe('matchesAgeGroup', () => {
  const t = (
    certification: string,
    mediaType = 'movie',
    genres: string[] = [],
  ) => ({
    certification,
    mediaType,
    genres,
  });
  it('buckets by minimum age', () => {
    expect(matchesAgeGroup(t('G'), 'kids')).toBe(true);
    expect(matchesAgeGroup(t('PG'), 'children')).toBe(true);
    expect(matchesAgeGroup(t('PG-13'), 'teens')).toBe(true);
    expect(matchesAgeGroup(t('R'), 'adults')).toBe(true);
    expect(matchesAgeGroup(t(''), 'adults')).toBe(false);
  });
  it('family covers all-ages and PG, not preschool TV or PG-13', () => {
    expect(matchesAgeGroup(t('PG'), 'family')).toBe(true);
    expect(matchesAgeGroup(t('TV-G', 'tv'), 'family')).toBe(true);
    expect(matchesAgeGroup(t('TV-Y', 'tv', ['Kids']), 'family')).toBe(false);
    expect(matchesAgeGroup(t('PG-13'), 'family')).toBe(false);
  });
});
