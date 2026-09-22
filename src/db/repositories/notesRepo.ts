import { eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { userNotes } from '../schema';

export async function getNotesForTitle(titleId: string) {
  await ensureMigrated();
  return db.select().from(userNotes).where(eq(userNotes.titleId, titleId));
}

export async function addNote(titleId: string, body: string) {
  await ensureMigrated();
  const now = Date.now();
  await db.insert(userNotes).values({
    titleId,
    body,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateNote(id: number, body: string) {
  await ensureMigrated();
  await db
    .update(userNotes)
    .set({ body, updatedAt: Date.now() })
    .where(eq(userNotes.id, id));
}

export async function deleteNote(id: number) {
  await ensureMigrated();
  await db.delete(userNotes).where(eq(userNotes.id, id));
}

export async function getAllNotes() {
  await ensureMigrated();
  return db.select().from(userNotes);
}
