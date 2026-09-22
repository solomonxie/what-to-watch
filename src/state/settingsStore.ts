import { create } from 'zustand';
import { getSettings, updateSettings, type AppSettings } from '../db/repositories/settingsRepo';

interface SettingsStore {
  settings: AppSettings | null;
  loading: boolean;
  load: () => Promise<void>;
  togglePlatform: (platformId: string) => Promise<void>;
  setIcloudSyncEnabled: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    const settings = await getSettings();
    set({ settings, loading: false });
  },

  togglePlatform: async (platformId: string) => {
    const current = get().settings;
    if (!current) return;
    const enabled = current.enabledPlatformIds.includes(platformId)
      ? current.enabledPlatformIds.filter(id => id !== platformId)
      : [...current.enabledPlatformIds, platformId];
    const settings = await updateSettings({ enabledPlatformIds: enabled });
    set({ settings });
  },

  setIcloudSyncEnabled: async (enabled: boolean) => {
    const settings = await updateSettings({ icloudSyncEnabled: enabled });
    set({ settings });
  },
}));
