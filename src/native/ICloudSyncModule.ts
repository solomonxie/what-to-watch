import { NativeModules, Platform } from 'react-native';

export type ICloudStatus =
  | 'unsupported'
  | 'available'
  | 'notEntitled'
  | 'driveOff'
  | 'notReady';

export interface ICloudBackupFile {
  name: string;
  size: number;
  modifiedAt: number;
  /** False while it's only a placeholder for a file still in iCloud. */
  downloaded: boolean;
}

interface NativeICloudSyncModule {
  status(): Promise<Exclude<ICloudStatus, 'unsupported'>>;
  writeBackup(fileName: string, base64: string): Promise<void>;
  appendFile(fileName: string, base64: string): Promise<void>;
  listBackups(): Promise<ICloudBackupFile[]>;
  readBackup(fileName: string): Promise<string>;
  deleteBackup(fileName: string): Promise<void>;
  beginBackgroundTask(): Promise<number>;
  endBackgroundTask(id: number): void;
}

const NativeModule: NativeICloudSyncModule | undefined =
  Platform.OS === 'ios' ? NativeModules.ICloudSyncModule : undefined;

/** A hung iCloud call must fail visibly, not stall every later backup. */
function timeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`iCloud didn't respond (${what})`)),
      ms,
    );
    work.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function required(): NativeICloudSyncModule {
  if (!NativeModule) throw new Error('iCloud Drive is not supported here');
  return NativeModule;
}

/** File contents travel as base64 bytes. */
export const ICloudDrive = {
  async status(): Promise<ICloudStatus> {
    if (!NativeModule) return 'unsupported';
    return timeout(NativeModule.status(), 30_000, 'status');
  },
  writeBackup: (fileName: string, base64: string) =>
    timeout(required().writeBackup(fileName, base64), 120_000, 'write'),
  appendFile: (fileName: string, base64: string) =>
    timeout(required().appendFile(fileName, base64), 60_000, 'append'),
  async listBackups(): Promise<ICloudBackupFile[]> {
    return NativeModule
      ? timeout(NativeModule.listBackups(), 30_000, 'list')
      : [];
  },
  readBackup: (fileName: string) =>
    timeout(required().readBackup(fileName), 90_000, 'read'),
  deleteBackup: (fileName: string) =>
    timeout(required().deleteBackup(fileName), 30_000, 'delete'),
};

/** Runs `work` with iOS background time, so leaving the app doesn't cut it off. */
export async function withBackgroundTime<T>(
  work: () => Promise<T>,
): Promise<T> {
  const id = NativeModule
    ? await NativeModule.beginBackgroundTask().catch(() => null)
    : null;
  try {
    return await work();
  } finally {
    if (id != null) NativeModule?.endBackgroundTask(id);
  }
}
