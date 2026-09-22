import { eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { settings } from '../schema';
import {
  DEFAULT_ENABLED_PLATFORM_IDS,
  DEFAULT_REGION,
  DEFAULT_LANGUAGE,
} from '../../config/platforms';

export type AppSettings = typeof settings.$inferSelect;

export async function getSettings(): Promise<AppSettings> {
  await ensureMigrated();
  const rows = await db.select().from(settings).limit(1);
  if (rows[0]) return rows[0];

  const [inserted] = await db
    .insert(settings)
    .values({
      enabledPlatformIds: DEFAULT_ENABLED_PLATFORM_IDS,
      icloudSyncEnabled: false,
      defaultRegion: DEFAULT_REGION,
      defaultLanguage: DEFAULT_LANGUAGE,
    })
    .returning();
  return inserted;
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<AppSettings> {
  await ensureMigrated();
  const current = await getSettings();
  const [updated] = await db
    .update(settings)
    .set(patch)
    .where(eq(settings.id, current.id))
    .returning();
  return updated ?? { ...current, ...patch };
}
