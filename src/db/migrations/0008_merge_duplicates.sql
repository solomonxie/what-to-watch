-- Each duplicate rating (and its comment) becomes a dated watch mark.
INSERT INTO user_notes (title_id, body, marked_at, created_at, updated_at)
SELECT title_id,
  'Rated ' || printf('%g', rating) || '/10' || COALESCE(' · ' || NULLIF(review_text, ''), ''),
  created_at, created_at, created_at
FROM user_ratings
WHERE title_id IN (SELECT title_id FROM user_ratings GROUP BY title_id HAVING COUNT(*) > 1);

-- The kept rating is their average.
UPDATE user_ratings
SET rating = (SELECT ROUND(AVG(r.rating)) FROM user_ratings r WHERE r.title_id = user_ratings.title_id)
WHERE id IN (SELECT MAX(id) FROM user_ratings GROUP BY title_id HAVING COUNT(*) > 1);

DELETE FROM user_ratings WHERE id NOT IN (SELECT MAX(id) FROM user_ratings GROUP BY title_id);

DELETE FROM watch_history WHERE id NOT IN (SELECT MAX(id) FROM watch_history GROUP BY title_id);
