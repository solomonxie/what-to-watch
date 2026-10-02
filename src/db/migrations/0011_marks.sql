CREATE TABLE marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  status TEXT,
  rating REAL,
  review TEXT NOT NULL DEFAULT '',
  marked_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_marks_title ON marks(title_id);

-- Notes already hold every rating (0010).
INSERT INTO marks (title_id, status, rating, review, marked_at, created_at, updated_at)
SELECT title_id, NULL, rating, body, COALESCE(marked_at, created_at), created_at, updated_at
FROM user_notes;

-- Each title's watch status becomes a status mark.
INSERT INTO marks (title_id, status, marked_at, created_at, updated_at)
SELECT title_id,
  CASE status WHEN 'toWatch' THEN 'interested' WHEN 'completed' THEN 'watched' ELSE status END,
  watched_at, watched_at, watched_at
FROM watch_history;

-- Each ticked episode becomes a watched mark on it.
INSERT INTO marks (title_id, season, episode, status, marked_at, created_at, updated_at)
SELECT title_id, season, episode, 'watched', watched_at, watched_at, watched_at
FROM episode_watches;

DROP TABLE user_notes;

DROP TABLE user_ratings;

DROP TABLE watch_history;

DROP TABLE episode_watches;
