CREATE TABLE score_cards (
  title_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  scores TEXT NOT NULL,
  final_score REAL NOT NULL,
  scored_at INTEGER NOT NULL
);
