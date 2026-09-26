import RNFS from 'react-native-fs';
import { AppState, Share } from 'react-native';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import { db, withTransaction } from '../db/client';
import { cachedTitles, settings, userNotes, userRatings, watchHistory } from '../db/schema';
import { getAllNotes } from '../db/repositories/notesRepo';
import { getAllUserRatings } from '../db/repositories/ratingsRepo';
import { getAllWatchHistory } from '../db/repositories/watchHistoryRepo';
import { getSettings } from '../db/repositories/settingsRepo';
import { getTitlesByIds } from '../db/repositories/titlesRepo';
import { getKv, setKv } from '../db/repositories/kvRepo';
import { ICloudDrive } from '../native/ICloudSyncModule';
import {
  LOCAL_DAILY_NAME,
  PAYLOAD_VERSION,
  beforeImportFileName,
  contentHash,
  datedFileName,
  hasUserData,
  parsePayload,
  selectExpired,
  shouldWrite,
  stripId,
  type BackupPayload,
} from './payload';

type Destination = 'local' | 'icloud';

const KV = {
  hash: (d: Destination) => `backup.hash.${d}`,
  at: (d: Destination) => `backup.at.${d}`,
  error: (d: Destination) => `backup.error.${d}`,
  restoreChecked: 'backup.restoreChecked',
};

const DOCS = RNFS.DocumentDirectoryPath;

export async function buildPayload(): Promise<BackupPayload> {
  const [notes, ratings, history, appSettings] = await Promise.all([
    getAllNotes(),
    getAllUserRatings(),
    getAllWatchHistory(),
    getSettings(),
  ]);
  const titleIds = Array.from(
    new Set([...notes, ...ratings, ...history].map(r => r.titleId)),
  );
  const titles = await getTitlesByIds(titleIds);
  return {
    version: PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    notes: notes.map(stripId),
    ratings: ratings.map(stripId),
    watchHistory: history.map(stripId),
    settings: stripId(appSettings),
    titles,
  };
}

const serialize = (p: BackupPayload) => JSON.stringify(p, null, 2);

async function writeLocal(name: string, payload: BackupPayload) {
  await RNFS.writeFile(`${DOCS}/${name}`, serialize(payload), 'utf8');
}

async function pruneLocal() {
  const entries = await RNFS.readDir(DOCS);
  const expired = selectExpired(
    entries
      .filter(e => e.isFile())
      .map(e => ({ name: e.name, mtimeMs: e.mtime?.getTime() ?? Date.now() })),
    Date.now(),
  );
  await Promise.all(expired.map(name => RNFS.unlink(`${DOCS}/${name}`)));
}

async function backupTo(
  dest: Destination,
  payload: BackupPayload,
  force = false,
): Promise<void> {
  const hash = contentHash(payload);
  if (!force && !shouldWrite(hash, await getKv(KV.hash(dest)))) return;
  try {
    if (dest === 'local') {
      await writeLocal(LOCAL_DAILY_NAME, payload);
      await pruneLocal();
    } else {
      await ICloudDrive.writeBackup(datedFileName(new Date()), serialize(payload));
    }
    await setKv(KV.hash(dest), hash);
    await setKv(KV.at(dest), String(Date.now()));
    await setKv(KV.error(dest), '');
  } catch (error) {
    await setKv(KV.error(dest), error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function backupNow(options: { forceICloud?: boolean } = {}) {
  const payload = await buildPayload();
  await backupTo('local', payload).catch(() => {});
  const appSettings = await getSettings();
  if (!appSettings.icloudSyncEnabled) return;
  if ((await ICloudDrive.status()) !== 'available') return;
  await backupTo('icloud', payload, options.forceICloud);
}

export async function getICloudBackupInfo(): Promise<{ lastAt: number | null; error: string | null }> {
  const [at, error] = await Promise.all([getKv(KV.at('icloud')), getKv(KV.error('icloud'))]);
  return { lastAt: at ? Number(at) : null, error: error || null };
}

let schedulerStarted = false;

export function startBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  AppState.addEventListener('change', state => {
    if (state === 'background') backupNow().catch(() => {});
  });
}

// Fresh install: pull the latest iCloud backup once, silently.
export async function restoreOnFreshInstall(): Promise<boolean> {
  if (await getKv(KV.restoreChecked)) return false;
  const [notes, ratings, history] = await Promise.all([
    getAllNotes(),
    getAllUserRatings(),
    getAllWatchHistory(),
  ]);
  if (hasUserData({ notes, ratings, watchHistory: history })) {
    await setKv(KV.restoreChecked, '1');
    return false;
  }
  if ((await ICloudDrive.status()) !== 'available') return false;
  const text = await ICloudDrive.readLatest();
  if (!text) return false;
  await replaceAllData(parsePayload(text));
  await setKv(KV.restoreChecked, '1');
  return true;
}

export async function exportCopy(): Promise<void> {
  const payload = await buildPayload();
  const path = `${RNFS.CachesDirectoryPath}/${datedFileName(new Date())}`;
  await RNFS.writeFile(path, serialize(payload), 'utf8');
  await Share.share({ url: `file://${path}`, title: 'What to Watch backup' });
}

export async function pickBackupFile(): Promise<BackupPayload> {
  const [picked] = await pick({ type: ['application/json', 'public.json'] });
  const [local] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: picked.name ?? 'import.json' }],
    destination: 'cachesDirectory',
  });
  if (local.status !== 'success') throw new Error('Could not read the selected file');
  const text = await RNFS.readFile(decodeURIComponent(local.localUri.replace(/^file:\/\//, '')), 'utf8');
  return parsePayload(text);
}

export async function importPayload(payload: BackupPayload) {
  await writeLocal(beforeImportFileName(new Date()), await buildPayload());
  await replaceAllData(payload);
  await setKv(KV.restoreChecked, '1');
  return {
    ratings: payload.ratings.length,
    notes: payload.notes.length,
    watched: payload.watchHistory.length,
  };
}

async function replaceAllData(payload: BackupPayload): Promise<void> {
  await withTransaction(async () => {
    const tx = db;
    await tx.delete(userNotes);
    if (payload.notes.length) await tx.insert(userNotes).values(payload.notes.map(stripId));
    await tx.delete(userRatings);
    if (payload.ratings.length) await tx.insert(userRatings).values(payload.ratings.map(stripId));
    await tx.delete(watchHistory);
    if (payload.watchHistory.length) {
      await tx.insert(watchHistory).values(payload.watchHistory.map(stripId));
    }
    if (payload.settings) {
      await tx.delete(settings);
      await tx.insert(settings).values(stripId(payload.settings));
    }
    for (const title of payload.titles ?? []) {
      await tx.insert(cachedTitles).values(title).onConflictDoNothing();
    }
  });
}
