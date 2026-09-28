export const RESPONSE_CACHE_STATEMENTS: string[] = [
  `CREATE TABLE response_cache (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    used_at INTEGER NOT NULL
  )`,
  'CREATE INDEX idx_response_cache_used_at ON response_cache(used_at)',
];
