import demoLibrary from '../../demo/library.json';
import { closeDatabase, ensureMigrated } from '../db/client';
import { getKv, setKv } from '../db/repositories/kvRepo';
import {
  backupsIdle,
  replaceAllData,
  startBackupScheduler,
} from '../backup/backupService';
import { parsePayload } from '../backup/payload';
import { refreshSearchIndex } from '../catalog/catalogService';
import { scheduleSpotlightSync, spotlightIdle } from '../search/spotlight';
import { useSettingsStore } from '../state/settingsStore';
import { useFilterStore } from '../state/filterStore';
import { usePrefsStore } from '../prefs/prefsStore';
import { isDemo, setDemoSwitch, useDataStore } from './demoMode';

const SEEDED = 'demo.seeded';

/** Dates in demo/library.json are relative to this; seeding shifts them to now. */
const DEMO_EPOCH = Date.parse('2026-10-01T12:00:00Z');

function shiftTimes<T>(rows: T[], delta: number): T[] {
  return rows.map(row => {
    const out = { ...row } as Record<string, unknown>;
    for (const key of ['markedAt', 'createdAt', 'updatedAt']) {
      if (typeof out[key] === 'number') out[key] = (out[key] as number) + delta;
    }
    return out as T;
  });
}

/** The preset library, dated as if it had been used up to today. */
export function demoPayload(now = Date.now()) {
  const payload = parsePayload(JSON.stringify(demoLibrary));
  const delta = now - DEMO_EPOCH;
  return {
    ...payload,
    marks: shiftTimes(payload.marks, delta),
  };
}

/** Opens the current mode's database; a fresh demo one gets the preset library. */
export async function prepareDataStore(): Promise<void> {
  await ensureMigrated();
  if (!isDemo() || (await getKv(SEEDED))) return;
  await replaceAllData(demoPayload());
  await setKv(SEEDED, '1');
}

async function reopen(deleteFile: boolean): Promise<void> {
  await Promise.all([backupsIdle(), spotlightIdle()]);
  closeDatabase({ deleteFile });
  await prepareDataStore();
  useFilterStore.getState().resetFilters();
  await Promise.all([
    useSettingsStore.getState().load(),
    usePrefsStore.getState().load(),
    refreshSearchIndex(),
  ]);
  useDataStore.setState(s => ({ generation: s.generation + 1 }));
}

/** Swaps between the real and the demo database; the real one is closed, never written. */
export async function switchDataStore(demo: boolean): Promise<void> {
  if (demo === isDemo()) return;
  setDemoSwitch(demo);
  await reopen(false);
  if (!demo) {
    startBackupScheduler();
    scheduleSpotlightSync();
  }
}

/** Throws away demo changes: a new demo database with the preset library. */
export async function resetDemoData(): Promise<void> {
  if (!isDemo()) return;
  await reopen(true);
}
