// Mirrors 0000_init.sql. Kept as a JS-importable string array since Metro
// cannot import raw .sql files; the .sql file is the source of truth for
// drizzle-kit tooling and manual inspection.
export const INIT_STATEMENTS: string[] = [
  `CREATE TABLE cached_titles (
    id TEXT PRIMARY KEY,
    tmdb_id TEXT,
    omdb_id TEXT,
    imdb_id TEXT,
    title TEXT NOT NULL,
    original_title TEXT,
    poster_path TEXT,
    overview TEXT,
    release_date TEXT,
    genres TEXT NOT NULL,
    runtime_minutes INTEGER,
    media_type TEXT NOT NULL,
    primary_rating_score REAL,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE TABLE cached_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    source TEXT NOT NULL,
    raw_value REAL NOT NULL,
    scale TEXT NOT NULL,
    normalized_value REAL NOT NULL,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_cached_ratings_title_id ON cached_ratings(title_id)`,
  `CREATE TABLE cached_watch_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    platform_name TEXT NOT NULL,
    region TEXT NOT NULL,
    availability_type TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_cached_watch_providers_title_id ON cached_watch_providers(title_id)`,
  `CREATE INDEX idx_cached_watch_providers_platform ON cached_watch_providers(platform_id, region)`,
  `CREATE TABLE platform_rankings_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id TEXT NOT NULL,
    region TEXT NOT NULL,
    category TEXT NOT NULL,
    rank INTEGER NOT NULL,
    title_id TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    ttl_expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_platform_rankings_lookup ON platform_rankings_cache(platform_id, region, category)`,
  `CREATE TABLE user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_user_notes_title_id ON user_notes(title_id)`,
  `CREATE TABLE user_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    rating REAL NOT NULL,
    review_text TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_user_ratings_title_id ON user_ratings(title_id)`,
  `CREATE TABLE watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    watched_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    rewatch_count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX idx_watch_history_title_id ON watch_history(title_id)`,
  `CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled_platform_ids TEXT NOT NULL,
    icloud_sync_enabled INTEGER NOT NULL DEFAULT 0,
    default_region TEXT NOT NULL DEFAULT 'US',
    default_language TEXT NOT NULL DEFAULT 'en-US',
    filter_defaults TEXT
  )`,
];
