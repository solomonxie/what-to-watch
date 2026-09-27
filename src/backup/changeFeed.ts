// Repositories report user-data writes here; the backup service listens.
// Kept free of imports so repositories can use it without a cycle.
const QUIET_MS = 3000;

let listener: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function onDataChanged(fn: () => void): void {
  listener = fn;
}

/** Debounced: a burst of writes (an import, a season marked) is one change. */
export function markDataChanged(): void {
  if (!listener) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    listener?.();
  }, QUIET_MS);
}
