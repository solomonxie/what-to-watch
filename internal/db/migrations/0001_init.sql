-- Initial schema: one row per title scraped by cmd/collector.
-- cmd/search-api reads from this table.
-- TODO: revisit indexing once real filter/sort patterns are known --
-- likely GIN indexes on genres/platforms for containment queries.

CREATE TABLE IF NOT EXISTS titles (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL,                  -- 'movie' or 'show'
    release_year    INTEGER,
    genres          TEXT[] NOT NULL DEFAULT '{}',
    platforms       TEXT[] NOT NULL DEFAULT '{}',   -- e.g. {'Netflix','Hulu'}
    score_imdb      NUMERIC(3,1),
    score_rt        SMALLINT,                       -- Rotten Tomatoes %, 0-100
    source          TEXT NOT NULL,
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
