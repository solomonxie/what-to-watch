import { useColorScheme } from 'react-native';

const light = {
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  secondary: '#6C6C70',
  tertiary: '#AEAEB2',
  separator: '#C6C6C8',
  accent: '#0A84FF',
  danger: '#FF3B30',
  star: '#FFB800',
  chip: '#EFEFF4',
  placeholder: '#E5E5EA',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#000000',
  groupedBackground: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  secondary: '#98989F',
  tertiary: '#636366',
  separator: '#38383A',
  accent: '#0A84FF',
  danger: '#FF453A',
  star: '#FFC933',
  chip: '#2C2C2E',
  placeholder: '#2C2C2E',
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

export const type = {
  section: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  body: { fontSize: 17 },
  meta: { fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700' as const },
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
