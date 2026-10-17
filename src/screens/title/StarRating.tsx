import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, type, useColors } from '../../ui/theme';
import { tf } from '../../i18n';

/** Five stars in half steps; each half star is one point of a 10-point score. */
export function StarRating({
  value,
  onChange,
  size = 32,
  showValue = true,
  cycle = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  showValue?: boolean;
  /** A tap steps that star full → half → empty, instead of picking the half by where it lands. */
  cycle?: boolean;
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
            accessibilityLabel={tf(i ? '{0} stars' : '{0} star', i + 1)}
            onPress={e =>
              onChange?.(
                cycle
                  ? value === i * 2 + 2
                    ? i * 2 + 1
                    : value === i * 2 + 1
                    ? i * 2
                    : i * 2 + 2
                  : i * 2 + (e.nativeEvent.locationX < size / 2 ? 1 : 2),
              )
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
