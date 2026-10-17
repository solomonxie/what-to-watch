import { NativeModules, Platform } from 'react-native';
import { zh } from './zh';

export type Language = 'system' | 'en' | 'zh';

const KEY = 'app.language';

// Loaded on use so importing t() never opens the database.
const kv = () =>
  require('../db/repositories/kvRepo') as typeof import('../db/repositories/kvRepo');

function deviceIsChinese(): boolean {
  if (Platform.OS !== 'ios') return false;
  const s = NativeModules.SettingsManager?.settings;
  return String(s?.AppleLanguages?.[0] ?? s?.AppleLocale ?? 'en')
    .toLowerCase()
    .startsWith('zh');
}

let choice: Language = 'system';
let chinese = deviceIsChinese();

export const getLanguage = () => choice;

function apply(l: Language) {
  choice = l;
  chinese = l === 'system' ? deviceIsChinese() : l === 'zh';
}

/** Read before any screen module loads: their constants are translated once. */
export async function loadLanguage() {
  const saved = await kv()
    .getKv(KEY)
    .catch(() => null);
  apply(saved === 'en' || saved === 'zh' ? saved : 'system');
}

export async function saveLanguage(l: Language) {
  await kv().setKv(KEY, l);
  apply(l);
}

/** The English text is the key; Chinese gets its entry in zh.ts. */
export function t(en: string): string {
  return chinese ? zh[en] ?? en : en;
}

/** t() with {0}, {1}… placeholders filled in. */
export function tf(en: string, ...args: Array<string | number>): string {
  return t(en).replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)]));
}
