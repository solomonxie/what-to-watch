import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettingsStore } from '../../state/settingsStore';
import { DEFAULT_REGION } from '../../config/platforms';
import { EmptyState } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { SearchResults } from './SearchResults';
import type { SearchStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

export function SearchScreen({ navigation }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const region = useSettingsStore(
    s => s.settings?.defaultRegion ?? DEFAULT_REGION,
  );
  const [query, setQuery] = useState('');

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[
        styles.root,
        { backgroundColor: c.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.results}>
        {query.trim() ? (
          <SearchResults
            query={query}
            region={region}
            onOpen={titleId => navigation.navigate('Title', { titleId })}
          />
        ) : (
          <EmptyState message="Search your library and everything on TMDB." />
        )}
      </View>
      <View
        style={[
          styles.bar,
          {
            borderTopColor: c.separator,
            paddingBottom: Math.max(insets.bottom, space.m),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: c.chip, color: c.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Movies, shows, cast"
          placeholderTextColor={c.secondary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Pressable onPress={() => navigation.getParent()?.goBack()} hitSlop={8}>
          <Text style={[styles.cancel, { color: c.accent }]}>Cancel</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  results: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingTop: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 23,
    paddingHorizontal: space.l,
    height: 46,
    fontSize: 17,
  },
  cancel: { fontSize: 17 },
});
