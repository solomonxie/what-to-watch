import { Platform, Settings } from 'react-native';
import { create } from 'zustand';

// NSUserDefaults, readable synchronously before the database opens.
const SWITCH = 'demoMode';

function read(key: string): unknown {
  if (Platform.OS !== 'ios') return undefined;
  try {
    return Settings.get(key);
  } catch {
    return undefined;
  }
}

let active: boolean | null = null;

/** Demo data store in use: Settings → Demo mode, or the `-demoMode 1` launch argument. */
export function isDemo(): boolean {
  active ??= !!read(SWITCH);
  return active;
}

/** Flips the switch only; switchDataStore reopens everything on top. */
export function setDemoSwitch(on: boolean): void {
  active = on;
  if (Platform.OS === 'ios') Settings.set({ [SWITCH]: on ? 1 : 0 });
}

/** Keys from .env.demo, baked in by `make ios`. */
export function demoApiKey(providerId: string): string | null {
  const key = read(`demo.${providerId}Key`);
  return typeof key === 'string' && key ? key : null;
}

/** `generation` changes when the data store is swapped; the app remounts on it. */
export const useDataStore = create(() => ({ generation: 0 }));
