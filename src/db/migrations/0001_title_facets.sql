ALTER TABLE cached_titles ADD COLUMN original_language TEXT;
ALTER TABLE cached_titles ADD COLUMN origin_countries TEXT;
ALTER TABLE cached_titles ADD COLUMN cast_names TEXT;
CREATE TABLE app_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
