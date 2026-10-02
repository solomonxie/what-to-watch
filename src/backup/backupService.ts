import RNFS from 'react-native-fs';
import { AppState, Share } from 'react-native';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import { db, withTransaction } from '../db/client';
import { cachedTitles, marks, settings } from '../db/schema';
import { getAllMarks } from '../db/repositories/marksRepo';
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
import { isDemo } from '../demo/demoMode';
import {
  ICLOUD_LOG,
  LOCAL_LOG,
  diffStates,
  logState,
  toJsonl,
} from './changeLog';
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
  payloadStats,
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
/** Changes settle this long before a local backup runs, so a burst is one run. */
const CHANGE_DEBOUNCE_MS = 10 * 1000;
/** The launch catch-up waits until the first screens have loaded. */
const LAUNCH_DELAY_MS = 8 * 1000;

const DOCS = RNFS.DocumentDirectoryPath;

export async function buildPayload(): Promise<BackupPayload> {
  const [allMarks, appSettings] = await Promise.all([
    getAllMarks(),
    getSettings(),
  ]);
  const titleIds = Array.from(new Set(allMarks.map(m => m.titleId)));
  const titles = await getTitlesByIds(titleIds);
  return {
    version: PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    marks: allMarks.map(stripId),
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

const hashes = new WeakMap<BackupPayload, string>();
function hashOf(payload: BackupPayload) {
  let hash = hashes.get(payload);
  if (!hash) {
    hash = contentHash(payload);
    hashes.set(payload, hash);
  }
  return hash;
}

/** Records the outcome per destination; the hash only after a successful write. */
async function gated(
  dest: Destination,
  payload: BackupPayload,
  force: boolean,
  write: () => Promise<void>,
) {
  const hash = hashOf(payload);
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

const LOG_STATE = `${RNFS.LibraryDirectoryPath}/changes-state.json`;
/** Log lines not yet appended to iCloud. */
const LOG_PENDING = `${RNFS.LibraryDirectoryPath}/changes-pending.jsonl`;

/**
 * Append-only: each change since the last run becomes a line in the log.
 * The first run only records where the log starts from.
 */
async function recordChanges(payload: BackupPayload) {
  const next = logState(payload);
  if (await RNFS.exists(LOG_STATE)) {
    const prev = JSON.parse(await RNFS.readFile(LOG_STATE, 'utf8'));
    // From before marks: every line would read as new. Start the log afresh.
    if (!prev.marks) {
      await RNFS.writeFile(LOG_STATE, JSON.stringify(next), 'utf8');
      return;
    }
    const names = Object.fromEntries(
      (payload.titles ?? []).map(t => [t.id, t.title]),
    );
    const lines = toJsonl(diffStates(prev, next, new Date(), names));
    if (!lines) return;
    await RNFS.appendFile(`${DOCS}/${LOCAL_LOG}`, lines, 'utf8');
    await RNFS.appendFile(LOG_PENDING, lines, 'utf8');
  }
  await RNFS.writeFile(LOG_STATE, JSON.stringify(next), 'utf8');
}

async function flushICloudLog() {
  if (!(await RNFS.exists(LOG_PENDING))) return;
  await ICloudDrive.appendFile(
    ICLOUD_LOG,
    await RNFS.readFile(LOG_PENDING, 'base64'),
  );
  await RNFS.unlink(LOG_PENDING);
}

/** Tier 1: one snapshot a day, replaced on each change, kept 7 days. */
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
  await flushICloudLog().catch(() => {});
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
  const capped = () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Backup timed out')),
          RUN_LIMIT_MS,
        );
      }),
    ]).finally(() => clearTimeout(timer));
  };
  const run = queue.then(capped, capped);
  queue = run.catch(() => {});
  return run;
}

/** Settles once queued backups have; a data store swap waits on it. */
export const backupsIdle = () => queue;

export function backupNow(options: { forceICloud?: boolean } = {}) {
  return serial(async () => {
    // Demo data never reaches backups, local or iCloud.
    if (isDemo()) return;
    const payload = await buildPayload();
    await recordChanges(payload).catch(() => {});
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
  if (isDemo()) throw new Error('Backups are off in demo mode');
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
  // In use: local snapshot only. Zipping for iCloud takes seconds on the JS
  // thread, so it waits for leaving the app.
  let pending: ReturnType<typeof setTimeout> | undefined;
  onDataChanged(() => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      serial(async () => {
        if (isDemo()) return;
        const payload = await buildPayload();
        await recordChanges(payload).catch(() => {});
        await backupLocal(payload).catch(() => {});
      }).catch(() => {});
    }, CHANGE_DEBOUNCE_MS);
  });
  AppState.addEventListener('change', state => {
    if (state !== 'background') return;
    withBackgroundTime(() => backupNow()).catch(() => {});
  });
  // Catch up: a backup cut short last time (app left, killed) completes now.
  // Unchanged data is skipped by the hash gate, so this is cheap.
  setTimeout(() => {
    defaultICloudOn()
      .catch(() => {})
      .then(() => backupNow())
      .catch(() => {});
  }, LAUNCH_DELAY_MS);
}

/** Backups stay off-phone by default: switch iCloud on once, where it can work. */
async function defaultICloudOn() {
  if (isDemo() || (await getKv(KV.iCloudDefaulted))) return;
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
  if (isDemo()) return false;
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
  if (isDemo()) return;
  await writeLocal(beforeImportFileName(new Date()), await buildPayload());
}

export async function importPayload(payload: BackupPayload) {
  await snapshotBeforeImport();
  await replaceAllData(payload);
  await setKv(KV.restoreChecked, '1');
  markDataChanged();
  return payloadStats(payload);
}

export async function replaceAllData(payload: BackupPayload): Promise<void> {
  await withTransaction(async () => {
    const tx = db;
    await tx.delete(marks);
    const rows = payload.marks.map(stripId);
    // Under SQLite's bound-variable limit.
    for (let i = 0; i < rows.length; i += 500)
      await tx.insert(marks).values(rows.slice(i, i + 500));
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
}
