import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { exportCopy, importPayload, pickBackupFile } from '../../backup/backupService';
import { useSettingsStore } from '../../state/settingsStore';

function isCancel(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === 'OPERATION_CANCELED' || /cancel/i.test(String(error));
}

export function ImportExportControls() {
  const [busy, setBusy] = useState(false);
  const loadSettings = useSettingsStore(s => s.load);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportCopy();
    } catch (error) {
      Alert.alert('Export failed', String(error));
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const payload = await pickBackupFile();
      Alert.alert(
        'Replace your data with this file?',
        'Your current data is saved first to Files → On My iPhone → What to Watch.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              try {
                const n = await importPayload(payload);
                await loadSettings();
                Alert.alert(
                  `Imported ${n.ratings} ratings, ${n.notes} notes, ${n.watched} watched`,
                );
              } catch (error) {
                Alert.alert(`⚠ Import failed: ${error instanceof Error ? error.message : error}`);
              }
            },
          },
        ],
      );
    } catch (error) {
      if (!isCancel(error)) {
        Alert.alert(`⚠ Import failed: ${error instanceof Error ? error.message : error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pressable style={styles.row} onPress={onExport} disabled={busy}>
        <Text style={styles.label}>Export a copy…</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={onImport} disabled={busy}>
        <Text style={styles.label}>Import from file…</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  label: { fontSize: 15, color: '#007aff' },
  chevron: { fontSize: 18, color: '#bbb' },
});
