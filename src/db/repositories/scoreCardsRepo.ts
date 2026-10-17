import { eq } from 'drizzle-orm';
import { db, ensureMigrated } from '../client';
import { scoreCards } from '../schema';
import { markDataChanged } from '../../backup/changeFeed';

export type ScoreCard = typeof scoreCards.$inferSelect;

const listeners = new Set<(titleId: string) => void>();

export function onScoreCardChanged(fn: (titleId: string) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function getScoreCard(titleId: string) {
  await ensureMigrated();
  const [card] = await db
    .select()
    .from(scoreCards)
    .where(eq(scoreCards.titleId, titleId));
  return card;
}

export async function getAllScoreCards(): Promise<ScoreCard[]> {
  await ensureMigrated();
  return db.select().from(scoreCards);
}

export async function saveScoreCard(card: Omit<ScoreCard, 'scoredAt'>) {
  await ensureMigrated();
  const row = { ...card, scoredAt: Date.now() };
  await db
    .insert(scoreCards)
    .values(row)
    .onConflictDoUpdate({ target: scoreCards.titleId, set: row });
  markDataChanged();
  listeners.forEach(fn => fn(card.titleId));
}

export async function deleteScoreCard(titleId: string) {
  await ensureMigrated();
  await db.delete(scoreCards).where(eq(scoreCards.titleId, titleId));
  markDataChanged();
  listeners.forEach(fn => fn(titleId));
}
