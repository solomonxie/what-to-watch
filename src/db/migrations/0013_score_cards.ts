// A title's detailed score: its per-aspect scores and the final result.
export const SCORE_CARDS_STATEMENTS: string[] = [
  `CREATE TABLE score_cards (
      title_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      scores TEXT NOT NULL,
      final_score REAL NOT NULL,
      scored_at INTEGER NOT NULL
    )`,
];
