import { eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { appKv } from '../schema';

export async function getKv(key: string): Promise<string | null> {
  await ensureMigrated();
  const rows = await db.select().from(appKv).where(eq(appKv.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setKv(key: string, value: string): Promise<void> {
  await ensureMigrated();
  await db
    .insert(appKv)
    .values({ key, value })
    .onConflictDoUpdate({ target: appKv.key, set: { value } });
}
