import type { Mark, MarkStatus } from './derive';

export const STATUS_LABELS: Record<MarkStatus, string> = {
  interested: 'Watch next',
  watching: 'Watching',
  watched: 'Watched',
  dropped: 'Dropped',
};

export function formatMarkDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "S2 · E5 · Watched · Oct 2, 2026" */
export function markLine(m: Mark): string {
  const place =
    m.season === null
      ? null
      : (m.season === 0 ? 'Specials' : `S${m.season}`) +
        (m.episode !== null ? ` · E${m.episode}` : '');
  return [
    place,
    m.status && STATUS_LABELS[m.status as MarkStatus],
    formatMarkDate(m.markedAt),
  ]
    .filter(Boolean)
    .join(' · ');
}
