import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { space, type, useColors } from './theme';

export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text style={[type.section, { color: c.secondary }]}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? c.text : c.chip }]}
    >
      <Text
        style={[styles.chipText, { color: selected ? c.background : c.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Pinned lead chip for a scrolling chip row; filled once filters apply. */
export function FilterButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const c = useColors();
  const on = count > 0;
  const fg = on ? c.background : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={on ? `Filters, ${count} active` : 'Filters'}
      style={({ pressed }) => [
        styles.filterButton,
        {
          backgroundColor: on ? c.text : 'transparent',
          borderColor: on ? c.text : c.separator,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.filterIcon}>
        {[14, 10, 6].map(w => (
          <View
            key={w}
            style={[styles.filterLine, { width: w, backgroundColor: fg }]}
          />
        ))}
      </View>
      <Text style={[styles.chipText, { color: fg }]}>
        {on ? `Filters · ${count}` : 'Filters'}
      </Text>
    </Pressable>
  );
}

export function ChipRow({
  children,
  scroll,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={styles.chipWrap}>{children}</View>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.chip }, style]}>
      {options.map(opt => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              on && { backgroundColor: c.card },
              on && styles.segmentOn,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: c.text },
                on && styles.segmentTextOn,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GroupedSection({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {header ? (
        <SectionLabel style={styles.groupHeader}>{header}</SectionLabel>
      ) : null}
      <View style={[styles.groupCard, { backgroundColor: c.card }]}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? (
              <View
                style={[styles.separator, { backgroundColor: c.separator }]}
              />
            ) : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Text style={[styles.groupFooter, { color: c.secondary }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Row({
  label,
  value,
  subtitle,
  onPress,
  chevron = !!onPress,
  toggle,
  destructive,
  accent,
}: {
  label: string;
  value?: string;
  subtitle?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  toggle?: {
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  };
  destructive?: boolean;
  accent?: boolean;
}) {
  const c = useColors();
  const labelColor = destructive ? c.danger : accent ? c.accent : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: c.chip },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[type.body, { color: labelColor }]}>{label}</Text>
        {typeof subtitle === 'string' ? (
          <Text style={[type.meta, styles.rowSubtitle, { color: c.secondary }]}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {value ? (
        <Text style={[type.body, { color: c.secondary }]}>{value}</Text>
      ) : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={toggle.disabled}
        />
      ) : null}
      {chevron ? (
        <Text style={[styles.chevron, { color: c.tertiary }]}>›</Text>
      ) : null}
    </Pressable>
  );
}

export function EmptyState({
  message,
  action,
  onAction,
  loading,
}: {
  message?: string;
  action?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      {loading ? <ActivityIndicator /> : null}
      {message ? (
        <Text style={[type.body, styles.emptyText, { color: c.secondary }]}>
          {message}
        </Text>
      ) : null}
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.pill, { backgroundColor: c.text }]}
        >
          <Text style={[styles.pillText, { color: c.background }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Poster({
  uri,
  title,
  width,
  radius = 10,
}: {
  uri?: string | null;
  title: string;
  width: number;
  radius?: number;
}) {
  const c = useColors();
  const style = {
    width,
    height: width * 1.5,
    borderRadius: radius,
    backgroundColor: c.placeholder,
  };
  if (uri) return <Image source={{ uri }} style={style} />;
  return (
    <View style={[style, styles.posterFallback]}>
      <Text style={[type.meta, { color: c.secondary }]} numberOfLines={4}>
        {title}
      </Text>
    </View>
  );
}

export interface GridItem {
  id: string;
  title: string;
  posterPath?: string | null;
  meta?: string;
  badge?: string;
  badgeCorner?: 'left' | 'right';
}

export const GRID_COLUMNS = 3;

/** Bottom padding so the floating search pill never covers content. */
export const FLOATING_CLEARANCE = 88;

export function usePosterWidth(): number {
  const { width } = useWindowDimensions();
  return (width - space.l * 2 - space.m * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
}

export function PosterTile({
  item,
  onPress,
}: {
  item: GridItem;
  onPress: () => void;
}) {
  const c = useColors();
  const w = usePosterWidth();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: w },
        styles.tile,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Poster uri={item.posterPath} title={item.title} width={w} />
        {item.badge ? (
          <View
            style={[
              styles.badge,
              item.badgeCorner === 'right'
                ? styles.badgeRight
                : styles.badgeLeft,
            ]}
          >
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileTitle, { color: c.text }]} numberOfLines={1}>
        {item.title}
      </Text>
      {item.meta ? (
        <Text style={[type.meta, { color: c.secondary }]} numberOfLines={1}>
          {item.meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function PosterGrid({
  items,
  onPress,
}: {
  items: GridItem[];
  onPress: (id: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map(item => (
        <PosterTile
          key={item.id}
          item={item}
          onPress={() => onPress(item.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    paddingHorizontal: space.l,
    marginTop: space.xl,
    marginBottom: space.s,
  },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18 },
  chipText: { fontSize: 15, fontWeight: '500' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: space.l,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterIcon: { gap: 2.5, alignItems: 'center' },
  filterLine: { height: 1.5, borderRadius: 1 },
  chipScroll: { paddingHorizontal: space.l, gap: space.s },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s,
    paddingHorizontal: space.l,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    marginHorizontal: space.l,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 7,
  },
  segmentOn: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: { fontSize: 14, fontWeight: '500' },
  segmentTextOn: { fontWeight: '600' },
  group: { marginBottom: space.s },
  groupHeader: { paddingHorizontal: space.l + space.l },
  groupCard: {
    marginHorizontal: space.l,
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupFooter: {
    fontSize: 13,
    paddingHorizontal: space.l * 2,
    paddingTop: space.s,
    lineHeight: 18,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.l },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: space.l,
    paddingVertical: 10,
    gap: space.s,
  },
  rowText: { flex: 1 },
  rowSubtitle: { marginTop: 2 },
  chevron: { fontSize: 24, marginTop: -2 },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: space.l,
  },
  emptyText: { textAlign: 'center' },
  pill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22 },
  pillText: { fontSize: 15, fontWeight: '600' },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s,
  },
  tile: { marginBottom: space.l },
  pressed: { opacity: 0.6 },
  tileTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  badge: {
    position: 'absolute',
    top: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLeft: { left: 6 },
  badgeRight: { right: 6 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.m,
    paddingHorizontal: space.l,
  },
});
