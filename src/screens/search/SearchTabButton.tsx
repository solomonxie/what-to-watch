import React, { useEffect, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../ui/theme';
import type { RootStackParamList } from '../../navigation/types';

const SIZE = 32;
// Height of the tab bar above the home indicator.
const TAB_BAR_HEIGHT = 49;

/** Oversized search icon drawn over the middle tab; the system caps tab icon size. */
export function SearchTabButton() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [keyboard, setKeyboard] = useState(false);
  const onSearch = useNavigationState(root => {
    const tabs = root.routes[root.index]?.state;
    return tabs?.routes[tabs.index ?? 0]?.name === 'SearchTab';
  });

  useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardWillShow', () => setKeyboard(true)),
      Keyboard.addListener('keyboardWillHide', () => setKeyboard(false)),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  if (keyboard) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.slot,
        { bottom: insets.bottom + (TAB_BAR_HEIGHT - SIZE) / 2 },
      ]}
    >
      <Pressable
        onPress={() =>
          navigation.navigate('Tabs', {
            screen: 'SearchTab',
            // A fresh value refocuses the input even when already on Search.
            params: { screen: 'SearchHome', params: { focus: Date.now() } },
          })
        }
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Search"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Image
          source={require('../../assets/search.png')}
          style={[styles.icon, { tintColor: onSearch ? c.accent : c.text }]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  icon: { width: SIZE, height: SIZE },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
