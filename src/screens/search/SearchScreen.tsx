import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { getAllWatchHistory } from '../../db/repositories/watchHistoryRepo';
import { getAllUserRatings } from '../../db/repositories/ratingsRepo';
import { refreshSearchIndex } from '../../catalog/catalogService';
import { isSearchIndexBuilt } from '../../search/titleIndex';
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
  const [library, setLibrary] = useState<Set<string>>(() => new Set());
  const [indexVersion, setIndexVersion] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardWillShow', () => setKeyboard(true)),
      Keyboard.addListener('keyboardWillHide', () => setKeyboard(false)),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  // First pull hides the keyboard, the next leaves search.
  const pullDown = () => {
    if (keyboard) Keyboard.dismiss();
    else navigation.getParent()?.goBack();
  };
  const input = useRef<React.ElementRef<typeof TextInput>>(null);

  // Ready to type whenever the tab is opened or its button tapped again.
  useFocusEffect(
    useCallback(() => {
      input.current?.focus();
    }, []),
  );
  const focusRequest = route.params?.focus;
  useEffect(() => {
    if (focusRequest) input.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    getSearchHistory()
      .then(setHistory)
      .catch(() => {});
    Promise.all([getAllWatchHistory(), getAllUserRatings()])
      .then(([h, r]) => setLibrary(new Set([...h, ...r].map(x => x.titleId))))
      .catch(() => {});
    // Normally built by Discover at launch; a deep link can arrive first.
    if (!isSearchIndexBuilt())
      refreshSearchIndex()
        .then(() => setIndexVersion(v => v + 1))
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
            library={library}
            indexVersion={indexVersion}
            onPullDown={pullDown}
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
            onPullDown={pullDown}
          />
        )}
      </View>
      <View
        style={[
          styles.bar,
          {
            borderTopColor: c.separator,
            paddingBottom: keyboard
              ? space.m
              : Math.max(insets.bottom, space.m),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: c.chip, color: c.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Movies, shows, cast"
          placeholderTextColor={c.secondary}
          ref={input}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={remember}
          clearButtonMode="while-editing"
        />
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
});
