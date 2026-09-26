import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Switch, Text, View } from 'react-native';
import { ICloudDrive, type ICloudStatus } from '../../native/ICloudSyncModule';
import { useSettingsStore } from '../../state/settingsStore';
import { backupNow, getICloudBackupInfo } from '../../backup/backupService';

const LOCATION = 'Files → iCloud Drive → What to Watch';

const BLOCKED: Partial<Record<ICloudStatus, { reason: string; fix?: string }>> = {
  driveOff: {
    reason: 'iCloud Drive is off on this device',
    fix: 'Settings → your name → iCloud → iCloud Drive → turn on',
  },
  notEntitled: { reason: "This build of the app isn't signed for iCloud" },
  notReady: { reason: 'iCloud is still setting up — try again shortly' },
};

function ago(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function ICloudSyncToggle() {
  const { settings, load, setIcloudSyncEnabled } = useSettingsStore();
  const [status, setStatus] = useState<ICloudStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [info, setInfo] = useState<{ lastAt: number | null; error: string | null }>({
    lastAt: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setStatus(await ICloudDrive.status());
    setInfo(await getICloudBackupInfo());
  }, []);

  useEffect(() => {
    if (!settings) load();
  }, [settings, load]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (status === null || status === 'unsupported') return null;

  const blocked = BLOCKED[status];
  const enabled = !blocked && (settings?.icloudSyncEnabled ?? false);

  const onToggle = async (value: boolean) => {
    await setIcloudSyncEnabled(value);
    if (!value) return;
    setWorking(true);
    try {
      await backupNow({ forceICloud: true });
    } catch {
      // error is recorded and shown via getICloudBackupInfo
    } finally {
      setWorking(false);
      refresh();
    }
  };

  let subtitle: React.ReactNode;
  if (blocked) {
    subtitle = (
      <>
        <Text style={styles.note}>{blocked.reason}</Text>
        {blocked.fix ? <Text style={styles.fix}>{blocked.fix}</Text> : null}
      </>
    );
  } else if (enabled && working) {
    subtitle = <Text style={styles.note}>⟳ Backing up…</Text>;
  } else if (enabled && info.error) {
    subtitle = <Text style={styles.error}>⚠ Last backup failed: {info.error}</Text>;
  } else {
    subtitle = (
      <Text style={styles.note}>
        {LOCATION}
        {enabled && info.lastAt ? ` · ${ago(info.lastAt)}` : ''}
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>iCloud Drive</Text>
        {subtitle}
      </View>
      <Switch disabled={!!blocked || working} value={enabled} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  textCol: { flex: 1, paddingRight: 12 },
  label: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 12, color: '#888', marginTop: 2 },
  fix: { fontSize: 12, color: '#007aff', marginTop: 2 },
  error: { fontSize: 12, color: '#c0392b', marginTop: 2 },
});
