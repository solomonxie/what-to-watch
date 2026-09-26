import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  clearApiKey,
  getApiKey,
  saveApiKey,
} from '../../secureStorage/apiKeyStore';
import { verifyApiKey } from '../../providers/keyCheck';
import { refreshSearchIndex } from '../../catalog/catalogService';
import { space, type, useColors } from '../../ui/theme';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ApiKey'>;

const INFO = {
  tmdb: {
    name: 'TMDB',
    url: 'https://www.themoviedb.org/settings/api',
    hint: 'Get a free key at themoviedb.org → Settings → API. Use the short "API Key", not the Read Access Token.',
  },
  omdb: {
    name: 'OMDb',
    url: 'https://www.omdbapi.com/apikey.aspx',
    hint: 'Get a free key at omdbapi.com and activate it from the email they send.',
  },
};

export function ApiKeyScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const info = INFO[providerId];
  const c = useColors();
  const [saved, setSaved] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(
    () => navigation.setOptions({ title: info.name }),
    [navigation, info.name],
  );

  useEffect(() => {
    getApiKey(providerId).then(k => {
      setSaved(k);
      setValue(k ?? '');
    });
  }, [providerId]);

  const trimmed = value.trim();
  const canSave = !!trimmed && trimmed !== saved && !checking;

  const onSave = async () => {
    setChecking(true);
    setError(null);
    try {
      await verifyApiKey(providerId, trimmed);
      await saveApiKey(providerId, trimmed);
      refreshSearchIndex();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  const onRemove = () =>
    Alert.alert(`Remove ${info.name} key?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey(providerId);
          navigation.goBack();
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: c.groupedBackground }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <View style={[styles.field, { backgroundColor: c.card }]}>
        <TextInput
          style={[styles.input, { color: c.text }]}
          value={value}
          onChangeText={t => {
            setValue(t);
            setError(null);
          }}
          placeholder="API key"
          placeholderTextColor={c.tertiary}
          secureTextEntry={!reveal}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          smartInsertDelete={false}
          textContentType="none"
          onSubmitEditing={canSave ? onSave : undefined}
        />
        <Pressable onPress={() => setReveal(r => !r)} hitSlop={8}>
          <Text style={[styles.inline, { color: c.accent }]}>
            {reveal ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[type.meta, styles.note, { color: c.danger }]}>
          ⚠ {error}
        </Text>
      ) : null}
      <Text style={[type.meta, styles.note, { color: c.secondary }]}>
        {info.hint}{' '}
        <Text
          style={{ color: c.accent }}
          onPress={() => Linking.openURL(info.url)}
        >
          Open site
        </Text>
      </Text>

      <Pressable
        onPress={onSave}
        disabled={!canSave}
        style={[
          styles.save,
          { backgroundColor: c.accent },
          !canSave && styles.disabled,
        ]}
      >
        {checking ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </Pressable>

      {saved ? (
        <Pressable onPress={onRemove} style={styles.remove} hitSlop={8}>
          <Text style={[type.body, { color: c.danger }]}>Remove key</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.l, gap: space.m },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: space.l,
    gap: space.l,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 14, fontFamily: 'Menlo' },
  inline: { fontSize: 15, fontWeight: '500' },
  note: { paddingHorizontal: space.l, lineHeight: 18 },
  save: {
    marginTop: space.m,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  saveText: { color: 'white', fontSize: 17, fontWeight: '600' },
  remove: { alignSelf: 'center', marginTop: space.s },
});
