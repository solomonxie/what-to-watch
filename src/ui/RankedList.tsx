import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { space, type, useColors } from './theme';

export const RANKED_ROW_HEIGHT = 48;

export interface RankedItem {
  key: string;
  label: string;
}

interface Props {
  items: RankedItem[];
  onReorder: (keys: string[]) => void;
  onRemove: (key: string) => void;
  /** Lets the parent disable its ScrollView while a row is held. */
  onDragChange?: (dragging: boolean) => void;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function RankedList({
  items,
  onReorder,
  onRemove,
  onDragChange,
}: Props) {
  const c = useColors();
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const dy = useRef(new Animated.Value(0)).current;
  const latest = useRef({ items, onReorder, onDragChange, drag });
  latest.current = { items, onReorder, onDragChange, drag };

  const target = (from: number, offset: number) =>
    Math.max(
      0,
      Math.min(
        latest.current.items.length - 1,
        Math.round(from + offset / RANKED_ROW_HEIGHT),
      ),
    );

  const responders = useMemo(
    () =>
      items.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            dy.setValue(0);
            setDrag({ from: index, to: index });
            latest.current.onDragChange?.(true);
          },
          onPanResponderMove: (_e, g) => {
            dy.setValue(g.dy);
            const to = target(index, g.dy);
            if (latest.current.drag?.to !== to) setDrag({ from: index, to });
          },
          onPanResponderRelease: (_e, g) => finish(index, target(index, g.dy)),
          onPanResponderTerminate: () => finish(index, index),
        }),
      ),
    // Rebuilt when the list length changes; handlers read the rest via `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length],
  );

  function finish(from: number, to: number) {
    setDrag(null);
    dy.setValue(0);
    latest.current.onDragChange?.(false);
    if (from !== to) {
      latest.current.onReorder(
        moveItem(latest.current.items, from, to).map(i => i.key),
      );
    }
  }

  const shiftFor = (index: number) => {
    if (!drag || index === drag.from) return 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to)
      return -RANKED_ROW_HEIGHT;
    if (drag.from > drag.to && index < drag.from && index >= drag.to)
      return RANKED_ROW_HEIGHT;
    return 0;
  };

  return (
    <View style={{ height: items.length * RANKED_ROW_HEIGHT }}>
      {items.map((item, index) => {
        const held = drag?.from === index;
        const rank = drag ? displayRank(index, drag) : index;
        return (
          <Animated.View
            key={item.key}
            style={[
              styles.row,
              { top: index * RANKED_ROW_HEIGHT, backgroundColor: c.card },
              held
                ? [
                    styles.held,
                    {
                      zIndex: 10,
                      transform: [{ translateY: dy }, { scale: 1.02 }],
                    },
                  ]
                : { transform: [{ translateY: shiftFor(index) }] },
            ]}
          >
            <Text style={[styles.rank, { color: c.secondary }]}>
              {rank + 1}
            </Text>
            <Text
              style={[type.body, styles.label, { color: c.text }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Pressable onPress={() => onRemove(item.key)} hitSlop={10}>
              <Text style={[styles.icon, { color: c.tertiary }]}>✕</Text>
            </Pressable>
            <View
              {...responders[index]?.panHandlers}
              style={styles.handle}
              hitSlop={8}
            >
              <Text style={[styles.icon, styles.grip, { color: c.tertiary }]}>
                ≡
              </Text>
            </View>
            {index > 0 && !held ? (
              <View
                style={[styles.separator, { backgroundColor: c.separator }]}
              />
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

function displayRank(
  index: number,
  drag: { from: number; to: number },
): number {
  if (index === drag.from) return drag.to;
  if (drag.from < drag.to && index > drag.from && index <= drag.to)
    return index - 1;
  if (drag.from > drag.to && index < drag.from && index >= drag.to)
    return index + 1;
  return index;
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: RANKED_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.l,
    gap: space.m,
  },
  held: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  rank: {
    width: 20,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  label: { flex: 1 },
  icon: { fontSize: 16 },
  grip: { fontSize: 22 },
  handle: {
    paddingHorizontal: space.l,
    height: RANKED_ROW_HEIGHT,
    justifyContent: 'center',
  },
  separator: {
    position: 'absolute',
    top: 0,
    left: space.l,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
