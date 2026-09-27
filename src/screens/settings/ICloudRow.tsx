import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/types';
import { ICloudDrive, type ICloudStatus } from '../../native/ICloudSyncModule';
import { useSettingsStore } from '../../state/settingsStore';
import { backupNow, getICloudBackupInfo } from '../../backup/backupService';
import { Row } from '../../ui/components';
import { type, useColors } from '../../ui/theme';

const LOCATION = 'Files → iCloud Drive → What to Watch';
const STALE_MS = 3 * 24 * 60 * 60 * 1000;

const BLOCKED: Partial<Record<ICloudStatus, { reason: string; fix?: string }>> =
  {
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

export function ICloudRow() {
  const c = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { settings, load, setIcloudSyncEnabled } = useSettingsStore();
  const [status, setStatus] = useState<ICloudStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [info, setInfo] = useState<{
    lastAt: number | null;
    error: string | null;
  }>({
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

  let subtitle: string;
  let subtitleColor = c.secondary;
  let fix: string | undefined;
  if (blocked) {
    subtitle = blocked.reason;
    fix = blocked.fix;
  } else if (enabled && working) {
    subtitle = 'Backing up…';
  } else if (enabled && info.error) {
    subtitle = `⚠ Last backup failed: ${info.error}`;
    subtitleColor = c.danger;
  } else if (enabled && info.lastAt && Date.now() - info.lastAt > STALE_MS) {
    subtitle = `⚠ Last backup ${ago(
      info.lastAt,
    )} — open the app on Wi-Fi to catch up`;
    subtitleColor = c.danger;
  } else {
    subtitle = `${LOCATION}${
      enabled && info.lastAt ? ` · ${ago(info.lastAt)}` : ''
    }`;
  }
  // Off, or can't work: say plainly what that means.
  const unprotected = !enabled && !working;

  return (
    <Row
      label="iCloud Drive"
      onPress={blocked ? undefined : () => navigation.navigate('ICloudBackups')}
      subtitle={
        <>
          <Text style={[type.meta, styles.line, { color: subtitleColor }]}>
            {subtitle}
          </Text>
          {fix ? (
            <Text style={[type.meta, styles.line, { color: c.accent }]}>
              {fix}
            </Text>
          ) : null}
          {unprotected ? (
            <Text style={[type.meta, styles.line, { color: c.danger }]}>
              Your marks are only on this iPhone — deleting the app deletes them
            </Text>
          ) : null}
        </>
      }
      toggle={{
        value: enabled,
        onChange: onToggle,
        disabled: !!blocked || working,
      }}
    />
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 2 },
});
