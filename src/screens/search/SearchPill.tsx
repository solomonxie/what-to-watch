import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useColors } from '../../ui/theme';
import type { RootStackParamList } from '../../navigation/types';

const TAB_BAR_HEIGHT = 49;

/** Floating search entry above the tab bar, reachable from every tab. */
export function SearchPill() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () =>
      setKeyboard(true),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboard) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('Search', { screen: 'SearchHome' })}
      style={({ pressed }) => [
        styles.pill,
        {
          bottom: insets.bottom + TAB_BAR_HEIGHT + space.m,
          backgroundColor: c.card,
          borderColor: c.separator,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.icon, { color: c.secondary }]}>⌕</Text>
      <Text style={[styles.text, { color: c.secondary }]}>
        Search movies, shows, cast
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.l,
    gap: space.s,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.85 },
  icon: { fontSize: 22, marginTop: -2 },
  text: { fontSize: 16 },
});
