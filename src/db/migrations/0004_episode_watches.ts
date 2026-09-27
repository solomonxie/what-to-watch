export const EPISODE_WATCHES_STATEMENTS: string[] = [
  `CREATE TABLE episode_watches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    watched_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX idx_episode_watches_key ON episode_watches(title_id, season, episode)',
];
