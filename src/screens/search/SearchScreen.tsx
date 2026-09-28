import React, { useEffect, useState } from 'react';
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
import { space, useColors } from '../../ui/theme';
import { SearchResults } from './SearchResults';
import { SearchHistory } from './SearchHistory';
import {
  getSearchHistory,
  saveSearchHistory,
  withQuery,
} from '../../search/searchHistory';
import type { SearchStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

export function SearchScreen({ navigation, route }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const region = useSettingsStore(
    s => s.settings?.defaultRegion ?? DEFAULT_REGION,
  );
  const [query, setQuery] = useState(route.params?.q ?? '');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    getSearchHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  const updateHistory = (next: string[]) => {
    setHistory(next);
    saveSearchHistory(next).catch(() => {});
  };
  const remember = () => updateHistory(withQuery(history, query));

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
            onOpen={titleId => {
              remember();
              navigation.navigate('Title', { titleId });
            }}
          />
        ) : (
          <SearchHistory
            history={history}
            onPick={setQuery}
            onRemove={q => updateHistory(history.filter(h => h !== q))}
            onClear={() => updateHistory([])}
          />
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
          onSubmitEditing={remember}
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
