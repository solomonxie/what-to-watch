import { t, tf } from '../i18n';

export function year(date?: string | null): string | undefined {
  return date ? date.slice(0, 4) : undefined;
}

export function score10(score?: number | null): string | undefined {
  return score ? (score / 10).toFixed(1) : undefined;
}

export function ago(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return t('just now');
  if (min < 60) return tf('{0} min ago', min);
  const h = Math.floor(min / 60);
  return h < 24 ? tf('{0} h ago', h) : tf('{0} d ago', Math.floor(h / 24));
}

export function mediaLabel(mediaType: string): string {
  return mediaType === 'tv' ? t('TV') : t('Movie');
}

export function joinMeta(
  parts: Array<string | number | undefined | null | false>,
): string {
  return parts.filter(Boolean).join(' · ');
}

export function formatDate(date: number | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
