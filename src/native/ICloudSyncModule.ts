import { NativeModules, Platform } from 'react-native';

export type ICloudStatus =
  | 'unsupported'
  | 'available'
  | 'notEntitled'
  | 'driveOff'
  | 'notReady';

interface NativeICloudSyncModule {
  status(): Promise<Exclude<ICloudStatus, 'unsupported'>>;
  writeBackup(fileName: string, contents: string): Promise<void>;
  readLatest(): Promise<string | null>;
}

const NativeModule: NativeICloudSyncModule | undefined =
  Platform.OS === 'ios' ? NativeModules.ICloudSyncModule : undefined;

export const ICloudDrive = {
  async status(): Promise<ICloudStatus> {
    if (!NativeModule) return 'unsupported';
    return NativeModule.status();
  },
  async writeBackup(fileName: string, contents: string): Promise<void> {
    if (!NativeModule) throw new Error('iCloud Drive is not supported here');
    return NativeModule.writeBackup(fileName, contents);
  },
  async readLatest(): Promise<string | null> {
    if (!NativeModule) return null;
    return NativeModule.readLatest();
  },
};
