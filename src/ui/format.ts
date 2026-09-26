export function year(date?: string | null): string | undefined {
  return date ? date.slice(0, 4) : undefined;
}

export function score10(score?: number | null): string | undefined {
  return score ? (score / 10).toFixed(1) : undefined;
}

export function mediaLabel(mediaType: string): string {
  return mediaType === 'tv' ? 'TV' : 'Movie';
}

export function joinMeta(
  parts: Array<string | number | undefined | null | false>,
): string {
  return parts.filter(Boolean).join(' · ');
}
