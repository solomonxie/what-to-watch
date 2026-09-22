import type { ProviderRating } from '../types/domain';

export function normalizeRating(
  raw: Omit<ProviderRating, 'normalizedValue'>,
): ProviderRating {
  let normalizedValue: number;
  switch (raw.scale) {
    case '0-10':
      normalizedValue = raw.rawValue * 10;
      break;
    case 'percent':
    case '0-100':
      normalizedValue = raw.rawValue;
      break;
    default:
      normalizedValue = raw.rawValue;
  }
  return { ...raw, normalizedValue: Math.max(0, Math.min(100, normalizedValue)) };
}

export function averageNormalizedScore(ratings: ProviderRating[]): number | undefined {
  if (ratings.length === 0) return undefined;
  const sum = ratings.reduce((acc, r) => acc + r.normalizedValue, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
