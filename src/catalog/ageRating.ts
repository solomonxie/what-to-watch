import type { AgeGroup } from '../types/domain';

const NAMED: Record<string, number> = {
  G: 0,
  U: 0,
  ALL: 0,
  'TV-Y': 0,
  'TV-G': 0,
  L: 0,
  AL: 0,
  PG: 8,
  'TV-PG': 8,
  M: 15,
  R: 17,
};

/** Youngest suitable age for a certification, e.g. PG-13 → 13, TV-MA → 17. */
export function minAge(certification?: string | null): number | undefined {
  if (!certification) return undefined;
  const cert = certification.trim().toUpperCase();
  if (cert === 'TV-MA') return 17;
  if (cert in NAMED) return NAMED[cert];
  const digits = cert.match(/\d+/);
  return digits ? Number(digits[0]) : undefined;
}

export interface RegionCertification {
  country: string;
  certification: string;
}

/** Prefer US, then the user's region, UK, origin countries, then any. */
export function pickCertification(
  entries: RegionCertification[],
  region: string,
  originCountries: string[] = [],
): string {
  const usable = entries.filter(e => minAge(e.certification) !== undefined);
  for (const country of ['US', region, 'GB', ...originCountries]) {
    const hit = usable.find(e => e.country === country);
    if (hit) return hit.certification.trim();
  }
  return usable[0]?.certification.trim() ?? '';
}

export interface AgeRatedTitle {
  certification?: string | null;
  mediaType?: string;
  genres: string[];
}

/** Family = everyone watching together: all ages or parental guidance, no preschool TV. */
export function matchesAgeGroup(
  title: AgeRatedTitle,
  group: AgeGroup,
): boolean {
  const age = minAge(title.certification);
  if (age === undefined) return false;
  switch (group) {
    case 'family':
      return (
        age <= 10 &&
        !(title.mediaType === 'tv' && title.genres.includes('Kids'))
      );
    case 'kids':
      return age <= 6;
    case 'children':
      return age >= 7 && age <= 12;
    case 'teens':
      return age >= 13 && age <= 16;
    case 'adults':
      return age >= 17;
  }
}
