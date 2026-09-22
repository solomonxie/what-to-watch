import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { ICloudSyncModule } from '../../native/ICloudSyncModule';
import { useSettingsStore } from '../../state/settingsStore';

export function ICloudSyncToggle() {
  const { settings, load, setIcloudSyncEnabled } = useSettingsStore();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!settings) load();
    ICloudSyncModule.isAvailable().then(setAvailable);
  }, [settings, load]);

  const isAndroid = Platform.OS === 'android';

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>Sync to iCloud</Text>
        {isAndroid ? (
          <Text style={styles.note}>Coming soon on Android</Text>
        ) : !available ? (
          <Text style={styles.note}>Sign in to iCloud on this device to enable</Text>
        ) : null}
      </View>
      <Switch
        disabled={isAndroid || !available}
        value={!isAndroid && (settings?.icloudSyncEnabled ?? false)}
        onValueChange={async value => {
          await ICloudSyncModule.setEnabled(value);
          await setIcloudSyncEnabled(value);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  textCol: { flexShrink: 1, paddingRight: 12 },
  label: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 12, color: '#888', marginTop: 2 },
});
