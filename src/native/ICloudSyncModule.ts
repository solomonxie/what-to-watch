import { NativeModules, Platform } from 'react-native';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'disabled';

interface NativeICloudSyncModule {
  isAvailable(): Promise<boolean>;
  getSyncStatus(): Promise<SyncStatus>;
  setEnabled(enabled: boolean): Promise<void>;
  syncNow(): Promise<void>;
}

const NativeModule: NativeICloudSyncModule | undefined =
  Platform.OS === 'ios' ? NativeModules.ICloudSyncModule : undefined;

export const ICloudSyncModule: NativeICloudSyncModule = {
  async isAvailable() {
    if (Platform.OS !== 'ios' || !NativeModule) return false;
    return NativeModule.isAvailable();
  },
  async getSyncStatus() {
    if (Platform.OS !== 'ios' || !NativeModule) return 'disabled';
    return NativeModule.getSyncStatus();
  },
  async setEnabled(enabled: boolean) {
    if (Platform.OS !== 'ios' || !NativeModule) return;
    return NativeModule.setEnabled(enabled);
  },
  async syncNow() {
    if (Platform.OS !== 'ios' || !NativeModule) return;
    return NativeModule.syncNow();
  },
};
