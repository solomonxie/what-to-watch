import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getApiKey, saveApiKey, clearApiKey } from '../../secureStorage/apiKeyStore';
import type { ProviderId } from '../../types/domain';

interface Props {
  providerId: ProviderId;
  label: string;
  note?: string;
}

export function ProviderApiKeyForm({ providerId, label, note }: Props) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await getApiKey(providerId);
      if (existing) {
        setValue(existing);
        setSaved(true);
      }
    })();
  }, [providerId]);

  const onSave = async () => {
    if (!value.trim()) return;
    await saveApiKey(providerId, value.trim());
    setSaved(true);
  };

  const onClear = async () => {
    await clearApiKey(providerId);
    setValue('');
    setSaved(false);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label} {saved ? '✓' : ''}
      </Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={`${label} API key`}
        secureTextEntry
        autoCapitalize="none"
      />
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onClear}>
          <Text style={styles.buttonText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  note: { fontSize: 12, color: '#888', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  button: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#333', borderRadius: 6 },
  buttonSecondary: { backgroundColor: '#999' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 13 },
});
