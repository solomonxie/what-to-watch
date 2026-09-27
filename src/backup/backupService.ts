import RNFS from 'react-native-fs';
import { AppState, Share } from 'react-native';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import { db, withTransaction } from '../db/client';
import {
  cachedTitles,
  episodeWatches,
  settings,
  userNotes,
  userRatings,
  watchHistory,
} from '../db/schema';
import { getAllNotes } from '../db/repositories/notesRepo';
import { getAllEpisodeWatches } from '../db/repositories/episodeWatchesRepo';
import { getAllUserRatings } from '../db/repositories/ratingsRepo';
import {
  getAllWatchHistory,
  rederiveStatuses,
} from '../db/repositories/watchHistoryRepo';
import { getSettings, updateSettings } from '../db/repositories/settingsRepo';
import { getTitlesByIds } from '../db/repositories/titlesRepo';
import { getKv, setKv } from '../db/repositories/kvRepo';
import {
  EMPTY_PREFS,
  readPreferences,
  writePreferences,
  type Preferences,
} from '../prefs/prefsStore';
import {
  ICloudDrive,
  withBackgroundTime,
  type ICloudBackupFile,
} from '../native/ICloudSyncModule';
import { markDataChanged, onDataChanged } from './changeFeed';
import {
  PAYLOAD_VERSION,
  SNAPSHOT_DIR,
  base64ToBytes,
  beforeImportFileName,
  bytesToBase64,
  contentHash,
  dailyZipName,
  iCloudFileName,
  selectExpiredICloud,
  userRecordCount,
  datedFileName,
  payloadFromBytes,
  selectExpired,
  selectExpiredSnapshots,
  shouldWrite,
  snapshotName,
  stripId,
  zipPayload,
  type BackupPayload,
} from './payload';

type Destination = 'local' | 'icloud';

const KV = {
  hash: (d: Destination) => `backup.hash.${d}`,
  at: (d: Destination) => `backup.at.${d}`,
  error: (d: Destination) => `backup.error.${d}`,
  restoreChecked: 'backup.restoreChecked',
  /** iCloud defaults on once; after that it's the user's switch. */
  iCloudDefaulted: 'backup.icloud.defaulted',
};

/** After a change, iCloud is refreshed at most this often (plus on leaving the app). */
const ICLOUD_MIN_INTERVAL_MS = 10 * 60 * 1000;

const DOCS = RNFS.DocumentDirectoryPath;

export async function buildPayload(): Promise<BackupPayload> {
  const [notes, ratings, history, episodes, appSettings] = await Promise.all([
    getAllNotes(),
    getAllUserRatings(),
    getAllWatchHistory(),
    getAllEpisodeWatches(),
    getSettings(),
  ]);
  const titleIds = Array.from(
    new Set(
      [...notes, ...ratings, ...history, ...episodes].map(r => r.titleId),
    ),
  );
  const titles = await getTitlesByIds(titleIds);
  return {
    version: PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    notes: notes.map(stripId),
    ratings: ratings.map(stripId),
    watchHistory: history.map(stripId),
    episodes: episodes.map(stripId),
    settings: stripId(appSettings),
    titles,
    preferences: await readPreferences(),
  };
}

const serialize = (p: BackupPayload) => JSON.stringify(p, null, 2);

async function writeLocal(name: string, payload: BackupPayload) {
  await RNFS.writeFile(`${DOCS}/${name}`, serialize(payload), 'utf8');
}

const SNAPSHOTS = `${DOCS}/${SNAPSHOT_DIR}`;

async function pruneLocal() {
  const top = await RNFS.readDir(DOCS);
  const expired = selectExpired(
    top
      .filter(e => e.isFile())
      .map(e => ({ name: e.name, mtimeMs: e.mtime?.getTime() ?? Date.now() })),
    Date.now(),
  );
  await Promise.all(expired.map(name => RNFS.unlink(`${DOCS}/${name}`)));
  const snapshots = (await RNFS.readDir(SNAPSHOTS)).map(e => e.name);
  await Promise.all(
    selectExpiredSnapshots(snapshots, new Date()).map(name =>
      RNFS.unlink(`${SNAPSHOTS}/${name}`),
    ),
  );
}

/** Records the outcome per destination; the hash only after a successful write. */
async function gated(
  dest: Destination,
  payload: BackupPayload,
  force: boolean,
  write: () => Promise<void>,
) {
  const hash = contentHash(payload);
  if (!force && !shouldWrite(hash, await getKv(KV.hash(dest)))) return;
  try {
    await write();
    await setKv(KV.hash(dest), hash);
    await setKv(KV.at(dest), String(Date.now()));
    await setKv(KV.error(dest), '');
  } catch (error) {
    await setKv(
      KV.error(dest),
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/** Tier 1: a snapshot per change, newest 20 a day for 7 days. */
async function backupLocal(payload: BackupPayload) {
  await gated('local', payload, false, async () => {
    await RNFS.mkdir(SNAPSHOTS);
    await writeLocal(`${SNAPSHOT_DIR}/${snapshotName(new Date())}`, payload);
    await pruneLocal();
  });
}

/**
 * Tier 2: a zip per day in iCloud Drive, refreshed while the day lasts —
 * except that a much smaller state never replaces a fuller copy of the same day.
 */
async function backupICloud(payload: BackupPayload, force: boolean) {
  const appSettings = await getSettings();
  if (!appSettings.icloudSyncEnabled) return;
  if ((await ICloudDrive.status()) !== 'available') return;
  // Nothing typed by hand yet: nothing to protect, and an empty file would
  // only compete with real backups.
  if (userRecordCount(payload) === 0) return;
  await gated('icloud', payload, force, async () => {
    const now = new Date();
    const zip = zipPayload(payload);
    const files = await ICloudDrive.listBackups();
    const today = files.find(f => f.name === dailyZipName(now));
    const name = iCloudFileName(now, today?.size ?? null, zip.length);
    await ICloudDrive.writeBackup(name, bytesToBase64(zip));
    await pruneICloud();
  });
}

async function pruneICloud() {
  const names = (await ICloudDrive.listBackups()).map(f => f.name);
  for (const name of selectExpiredICloud(names)) {
    await ICloudDrive.deleteBackup(name).catch(() => {});
  }
}

// One backup at a time: a change-triggered run and a leave-the-app run
// must not interleave their reads and writes.
// Each run is capped, so one that never settles can't block the rest.
const RUN_LIMIT_MS = 5 * 60 * 1000;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const capped = () =>
    Promise.race([
      work(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Backup timed out')), RUN_LIMIT_MS),
      ),
    ]);
  const run = queue.then(capped, capped);
  queue = run.catch(() => {});
  return run;
}

export function backupNow(options: { forceICloud?: boolean } = {}) {
  return serial(async () => {
    const payload = await buildPayload();
    await backupLocal(payload).catch(() => {});
    await backupICloud(payload, !!options.forceICloud);
  });
}

export async function listICloudBackups(): Promise<ICloudBackupFile[]> {
  if ((await ICloudDrive.status()) !== 'available') return [];
  return ICloudDrive.listBackups();
}

export async function readICloudBackup(name: string): Promise<BackupPayload> {
  return payloadFromBytes(base64ToBytes(await ICloudDrive.readBackup(name)));
}

export async function deleteICloudBackup(name: string): Promise<void> {
  await ICloudDrive.deleteBackup(name);
  // The next run must not skip rewriting a deleted day.
  await setKv(KV.hash('icloud'), '');
}

export async function getICloudBackupInfo(): Promise<{
  lastAt: number | null;
  error: string | null;
}> {
  const [at, error] = await Promise.all([
    getKv(KV.at('icloud')),
    getKv(KV.error('icloud')),
  ]);
  return { lastAt: at ? Number(at) : null, error: error || null };
}

let schedulerStarted = false;

export function startBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  let lastICloudAt = 0;
  onDataChanged(() => {
    serial(async () => {
      const payload = await buildPayload();
      await backupLocal(payload).catch(() => {});
      if (Date.now() - lastICloudAt < ICLOUD_MIN_INTERVAL_MS) return;
      lastICloudAt = Date.now();
      await backupICloud(payload, false);
    }).catch(() => {});
  });
  AppState.addEventListener('change', state => {
    if (state !== 'background') return;
    withBackgroundTime(() => backupNow()).catch(() => {});
  });
  // Catch up: a backup cut short last time (app left, killed) completes now.
  // Unchanged data is skipped by the hash gate, so this is cheap.
  defaultICloudOn()
    .catch(() => {})
    .then(() => backupNow())
    .catch(() => {});
}

/** Backups stay off-phone by default: switch iCloud on once, where it can work. */
async function defaultICloudOn() {
  if (await getKv(KV.iCloudDefaulted)) return;
  if ((await ICloudDrive.status()) !== 'available') return;
  await setKv(KV.iCloudDefaulted, '1');
  const current = await getSettings();
  if (!current.icloudSyncEnabled) {
    await updateSettings({ icloudSyncEnabled: true });
    await backupNow({ forceICloud: true });
  }
}

/**
 * Newest iCloud backup that holds any marks. After a wipe the newest file can
 * be an empty one, and restoring that would finish the loss.
 */
export async function latestUsefulICloudBackup(): Promise<{
  file: ICloudBackupFile;
  payload: BackupPayload;
} | null> {
  const files = await listICloudBackups();
  for (const file of files.sort((a, b) => b.modifiedAt - a.modifiedAt)) {
    const payload = await readICloudBackup(file.name).catch(() => null);
    if (payload && userRecordCount(payload) > 0) return { file, payload };
  }
  return null;
}

/**
 * Empty app (fresh install, or data cleared) with backups in iCloud: restore
 * the newest useful one, silently. Runs at every launch until the app has data.
 */
export async function restoreOnFreshInstall(): Promise<boolean> {
  if (userRecordCount(await buildPayload()) > 0) return false;
  const found = await latestUsefulICloudBackup();
  if (!found) return false;
  await replaceAllData(found.payload);
  await setKv(KV.restoreChecked, '1');
  // Keep backing up where the restored data came from.
  await updateSettings({ icloudSyncEnabled: true });
  return true;
}

export async function exportCopy(): Promise<void> {
  const payload = await buildPayload();
  const path = `${RNFS.CachesDirectoryPath}/${datedFileName(new Date())}`;
  await RNFS.writeFile(path, serialize(payload), 'utf8');
  await Share.share({ url: `file://${path}`, title: 'What to Watch backup' });
}

export async function pickBackupFile(): Promise<BackupPayload> {
  // JSON exports, and the zips iCloud keeps (picked from Files).
  const [picked] = await pick({
    type: ['application/json', 'public.json', 'public.zip-archive'],
  });
  const [local] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: picked.name ?? 'import.json' }],
    destination: 'cachesDirectory',
  });
  if (local.status !== 'success')
    throw new Error('Could not read the selected file');
  const base64 = await RNFS.readFile(
    decodeURIComponent(local.localUri.replace(/^file:\/\//, '')),
    'base64',
  );
  return payloadFromBytes(base64ToBytes(base64));
}

/** Tier-1 copy taken before any operation that rewrites many rows. */
export async function snapshotBeforeImport(): Promise<void> {
  await writeLocal(beforeImportFileName(new Date()), await buildPayload());
}

export async function importPayload(payload: BackupPayload) {
  await snapshotBeforeImport();
  await replaceAllData(payload);
  await setKv(KV.restoreChecked, '1');
  markDataChanged();
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
    if (payload.notes.length)
      await tx.insert(userNotes).values(payload.notes.map(stripId));
    await tx.delete(userRatings);
    if (payload.ratings.length)
      await tx.insert(userRatings).values(payload.ratings.map(stripId));
    await tx.delete(watchHistory);
    if (payload.watchHistory.length) {
      await tx.insert(watchHistory).values(payload.watchHistory.map(stripId));
    }
    if (payload.episodes) {
      await tx.delete(episodeWatches);
      if (payload.episodes.length)
        await tx.insert(episodeWatches).values(payload.episodes.map(stripId));
    }
    if (payload.settings) {
      await tx.delete(settings);
      await tx.insert(settings).values(stripId(payload.settings));
    }
    for (const title of payload.titles ?? []) {
      await tx.insert(cachedTitles).values(title).onConflictDoNothing();
    }
    if (payload.preferences) {
      await writePreferences({
        ...EMPTY_PREFS,
        ...(payload.preferences as Preferences),
      });
    }
  });
  // Older backups hold statuses from before they were derived.
  await rederiveStatuses();
}
