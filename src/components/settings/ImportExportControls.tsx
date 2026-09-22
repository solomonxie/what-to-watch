import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { exportToFile } from '../../importExport/exportService';
import { pickAndImportFile } from '../../importExport/importService';

export function ImportExportControls() {
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportToFile({ includeApiKeys });
    } catch (error) {
      Alert.alert('Export failed', String(error));
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      await pickAndImportFile();
      Alert.alert('Import complete');
    } catch (error) {
      Alert.alert('Import failed', String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Import / Export</Text>

      <Pressable style={styles.button} onPress={onExport} disabled={busy}>
        <Text style={styles.buttonText}>Export app data</Text>
      </Pressable>

      <View style={styles.checkboxRow}>
        <Switch value={includeApiKeys} onValueChange={setIncludeApiKeys} />
        <Text style={styles.checkboxLabel}>
          Include API keys (plaintext, not recommended)
        </Text>
      </View>

      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onImport} disabled={busy}>
        <Text style={styles.buttonText}>Import app data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  heading: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#333', borderRadius: 8, marginBottom: 8, alignSelf: 'flex-start' },
  buttonSecondary: { backgroundColor: '#666' },
  buttonText: { color: 'white', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  checkboxLabel: { fontSize: 12, color: '#888', flexShrink: 1 },
});
