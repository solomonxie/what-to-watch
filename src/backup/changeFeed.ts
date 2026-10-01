// Repositories report user-data writes here; backup and Spotlight listen.
// Kept free of imports so repositories can use it without a cycle.
const QUIET_MS = 3000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function onDataChanged(fn: () => void): void {
  listeners.add(fn);
}

/** Debounced: a burst of writes (an import, a season marked) is one change. */
export function markDataChanged(): void {
  if (listeners.size === 0) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    listeners.forEach(fn => fn());
  }, QUIET_MS);
}
