import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import {
  deleteICloudBackup,
  importPayload,
  listICloudBackups,
  readICloudBackup,
} from '../../backup/backupService';
import { payloadStats, type PayloadStats } from '../../backup/payload';
import type { ICloudBackupFile } from '../../native/ICloudSyncModule';
import { useSettingsStore } from '../../state/settingsStore';
import { usePrefsStore } from '../../prefs/prefsStore';
import {
  EmptyState,
  BOTTOM_CLEARANCE,
  GroupedSection,
  Row,
} from '../../ui/components';
import { joinMeta } from '../../ui/format';
import { type, useColors } from '../../ui/theme';

type Stats = PayloadStats | 'loading' | 'failed';

function when(ms: number): string {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const day = today
    ? 'Today'
    : d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
  return `${day} · ${time}`;
}

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

function describe(stats?: Stats): string {
  if (!stats || stats === 'loading') return 'Reading…';
  if (stats === 'failed') return "Couldn't read this backup";
  return (
    joinMeta([
      stats.watching && `${stats.watching} watching`,
      stats.watched && `${stats.watched} watched`,
      stats.toWatch && `${stats.toWatch} to watch`,
      stats.rated && `${stats.rated} rated`,
      stats.episodes && `${stats.episodes} episodes`,
      stats.notes && `${stats.notes} notes`,
    ]) || 'Empty'
  );
}

export function ICloudBackupsScreen() {
  const c = useColors();
  const loadSettings = useSettingsStore(s => s.load);
  const loadPrefs = usePrefsStore(s => s.load);
  const [files, setFiles] = useState<ICloudBackupFile[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});

  const refresh = useCallback(async () => {
    const list = await listICloudBackups().catch(() => []);
    setFiles(list);
    // Read one at a time: each may need downloading from iCloud first.
    for (const f of list) {
      setStats(s => ({ ...s, [f.name]: s[f.name] ?? 'loading' }));
      try {
        const p = await readICloudBackup(f.name);
        setStats(s => ({ ...s, [f.name]: payloadStats(p) }));
      } catch {
        setStats(s => ({ ...s, [f.name]: 'failed' }));
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const restore = async (file: ICloudBackupFile) => {
    try {
      await importPayload(await readICloudBackup(file.name));
      await Promise.all([loadSettings(), loadPrefs()]);
      Alert.alert(
        'Restored',
        `Your data is now as of ${when(file.modifiedAt)}.`,
      );
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : String(e));
    }
  };

  const remove = (file: ICloudBackupFile) =>
    Alert.alert('Delete this backup?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteICloudBackup(file.name);
          } catch (e) {
            Alert.alert(
              'Delete failed',
              e instanceof Error ? e.message : String(e),
            );
          }
          refresh();
        },
      },
    ]);

  const open = (file: ICloudBackupFile) =>
    Alert.alert(
      `Backup from ${when(file.modifiedAt)}`,
      'Restoring replaces your current data. A copy of it is kept on this device first.',
      [
        { text: 'Restore', onPress: () => restore(file) },
        { text: 'Delete', style: 'destructive', onPress: () => remove(file) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {files === null ? (
        <EmptyState loading />
      ) : files.length === 0 ? (
        <EmptyState message="No backups in iCloud Drive yet. One is written each day the app is used." />
      ) : (
        <GroupedSection
          header="Daily backups"
          footer="Files → iCloud Drive → What to Watch. Every day for 30 days, then one a month for a year."
        >
          {files.map(f => (
            <Row
              key={f.name}
              label={when(f.modifiedAt)}
              value={kb(f.size)}
              onPress={() => open(f)}
              chevron={false}
              subtitle={
                <Text style={[type.meta, styles.stats, { color: c.secondary }]}>
                  {describe(stats[f.name])}
                </Text>
              }
            />
          ))}
        </GroupedSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: BOTTOM_CLEARANCE },
  stats: { marginTop: 2 },
});
