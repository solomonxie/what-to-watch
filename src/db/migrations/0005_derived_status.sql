-- Same as 0005_derived_status.ts
UPDATE watch_history SET status = 'completed', rewatch_count = MAX(rewatch_count, 1) WHERE title_id LIKE 'movie:%' AND title_id IN (SELECT title_id FROM user_ratings);
UPDATE watch_history SET status = 'toWatch', rewatch_count = 0 WHERE title_id LIKE 'movie:%' AND title_id NOT IN (SELECT title_id FROM user_ratings);
INSERT INTO watch_history (title_id, status, watched_at, rewatch_count) SELECT title_id, 'completed', updated_at, 1 FROM user_ratings WHERE title_id LIKE 'movie:%' AND title_id NOT IN (SELECT title_id FROM watch_history);
UPDATE watch_history SET status = 'toWatch' WHERE title_id LIKE 'tv:%' AND status IN ('watching', 'dropped') AND title_id NOT IN (SELECT title_id FROM episode_watches);
