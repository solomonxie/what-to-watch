import { pick, keepLocalCopy } from '@react-native-documents/picker';
import { db, ensureMigrated } from '../db/client';
import { userNotes, userRatings, watchHistory, settings } from '../db/schema';

interface ExportPayload {
  version: number;
  notes: Array<Omit<typeof userNotes.$inferInsert, 'id'>>;
  ratings: Array<Omit<typeof userRatings.$inferInsert, 'id'>>;
  watchHistory: Array<Omit<typeof watchHistory.$inferInsert, 'id'>>;
  settings?: Omit<typeof settings.$inferInsert, 'id'>;
}

export async function pickAndImportFile(): Promise<void> {
  const [picked] = await pick({ type: ['application/json'] });
  const [localCopy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: picked.name ?? 'import.json' }],
    destination: 'cachesDirectory',
  });
  if (localCopy.status !== 'success') {
    throw new Error('Could not read the selected file');
  }
  const response = await fetch(localCopy.localUri);
  const text = await response.text();
  const payload = JSON.parse(text) as ExportPayload;
  await importPayload(payload);
}

export async function importPayload(payload: ExportPayload): Promise<void> {
  await ensureMigrated();

  await db.delete(userNotes);
  if (payload.notes.length > 0) {
    await db.insert(userNotes).values(payload.notes);
  }

  await db.delete(userRatings);
  if (payload.ratings.length > 0) {
    await db.insert(userRatings).values(payload.ratings);
  }

  await db.delete(watchHistory);
  if (payload.watchHistory.length > 0) {
    await db.insert(watchHistory).values(payload.watchHistory);
  }

  if (payload.settings) {
    await db.delete(settings);
    await db.insert(settings).values(payload.settings);
  }
}
