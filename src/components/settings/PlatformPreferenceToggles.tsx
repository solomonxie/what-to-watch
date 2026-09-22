import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PLATFORMS } from '../../config/platforms';
import { useSettingsStore } from '../../state/settingsStore';

export function PlatformPreferenceToggles() {
  const { settings, load, togglePlatform } = useSettingsStore();

  useEffect(() => {
    if (!settings) load();
  }, [settings, load]);

  const enabled = new Set(settings?.enabledPlatformIds ?? []);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Streaming Platforms</Text>
      <View style={styles.chips}>
        {PLATFORMS.map(platform => (
          <Pressable
            key={platform.id}
            style={[styles.chip, enabled.has(platform.id) && styles.chipActive]}
            onPress={() => togglePlatform(platform.id)}
          >
            <Text style={enabled.has(platform.id) ? styles.chipTextActive : styles.chipText}>
              {platform.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  heading: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#eee', borderRadius: 16 },
  chipActive: { backgroundColor: '#333' },
  chipText: { color: '#333' },
  chipTextActive: { color: 'white' },
});
