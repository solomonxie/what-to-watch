import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/types';
import { ICloudDrive, type ICloudStatus } from '../../native/ICloudSyncModule';
import { useSettingsStore } from '../../state/settingsStore';
import { backupNow, getICloudBackupInfo } from '../../backup/backupService';
import { Row } from '../../ui/components';
import { ago } from '../../ui/format';
import { type, useColors } from '../../ui/theme';
import { t, tf } from '../../i18n';

const LOCATION = t('Files → iCloud Drive → What to Watch');
const STALE_MS = 3 * 24 * 60 * 60 * 1000;

const BLOCKED: Partial<Record<ICloudStatus, { reason: string; fix?: string }>> =
  {
    driveOff: {
      reason: t('iCloud Drive is off on this device'),
      fix: t('Settings → your name → iCloud → iCloud Drive → turn on'),
    },
    notEntitled: { reason: t("This build of the app isn't signed for iCloud") },
    notReady: { reason: t('iCloud is still setting up — try again shortly') },
  };

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
    subtitle = t('Backing up…');
  } else if (enabled && info.error) {
    subtitle = tf('⚠ Last backup failed: {0}', info.error);
    subtitleColor = c.danger;
  } else if (enabled && info.lastAt && Date.now() - info.lastAt > STALE_MS) {
    subtitle = tf(
      '⚠ Last backup {0} — open the app on Wi-Fi to catch up',
      ago(info.lastAt),
    );
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
      label={t('iCloud Drive')}
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
              {t(
                'Your marks are only on this iPhone — deleting the app deletes them',
              )}
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
