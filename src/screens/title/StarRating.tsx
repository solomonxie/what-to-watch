import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, type, useColors } from '../../ui/theme';

/** Five stars in half steps; each half star is one point of a 10-point score. */
export function StarRating({
  value,
  onChange,
  size = 32,
  showValue = true,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  showValue?: boolean;
}) {
  const c = useColors();
  const box = { width: size, height: size };
  const glyph = { fontSize: size * 0.94, width: size };
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.min(Math.max(value - i * 2, 0), 2) / 2;
        return (
          <Pressable
            key={i}
            disabled={!onChange}
            accessibilityLabel={`${i + 1} star${i ? 's' : ''}`}
            onPress={e =>
              onChange?.(i * 2 + (e.nativeEvent.locationX < size / 2 ? 1 : 2))
            }
            style={[styles.box, box]}
          >
            <Text style={[styles.star, glyph, { color: c.placeholder }]}>
              ★
            </Text>
            <View style={[styles.fill, { width: size * fill }]}>
              <Text style={[styles.star, glyph, { color: c.star }]}>★</Text>
            </View>
          </Pressable>
        );
      })}
      {showValue ? (
        <Text style={[type.meta, styles.value, { color: c.secondary }]}>
          {value ? `${value} / 10` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  box: { justifyContent: 'center' },
  star: { textAlign: 'center' },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  value: { marginLeft: space.s },
});
