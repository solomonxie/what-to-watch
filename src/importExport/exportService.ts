import RNFS from 'react-native-fs';
import { Share } from 'react-native';
import { getAllNotes } from '../db/repositories/notesRepo';
import { getAllUserRatings } from '../db/repositories/ratingsRepo';
import { getAllWatchHistory } from '../db/repositories/watchHistoryRepo';
import { getSettings } from '../db/repositories/settingsRepo';
import { getApiKey } from '../secureStorage/apiKeyStore';
import type { ProviderId } from '../types/domain';

const PROVIDER_IDS: ProviderId[] = ['tmdb', 'omdb', 'imdb'];

export interface ExportOptions {
  includeApiKeys?: boolean;
}

export async function buildExportPayload(options: ExportOptions = {}) {
  const [notes, ratings, watchHistory, settings] = await Promise.all([
    getAllNotes(),
    getAllUserRatings(),
    getAllWatchHistory(),
    getSettings(),
  ]);

  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: 1,
    notes,
    ratings,
    watchHistory,
    settings,
  };

  if (options.includeApiKeys) {
    const keys: Record<string, string | null> = {};
    for (const id of PROVIDER_IDS) {
      keys[id] = await getApiKey(id);
    }
    payload.apiKeys = keys;
    payload.warning =
      'apiKeys are stored in plaintext in this file. Keep it private.';
  }

  return payload;
}

export async function exportToFile(options: ExportOptions = {}): Promise<string> {
  const payload = await buildExportPayload(options);
  const fileName = `what-to-watch-export-${Date.now()}.json`;
  const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  await RNFS.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  await Share.share({
    url: `file://${filePath}`,
    title: 'What to Watch data export',
  });
  return filePath;
}
