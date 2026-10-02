// Concurrent imports of one show's seasons left several ratings per title.
// Each becomes a dated mark; the kept rating is their average.
export const MERGE_DUPLICATES_STATEMENTS: string[] = [
  `INSERT INTO user_notes (title_id, body, marked_at, created_at, updated_at)
    SELECT title_id,
      'Rated ' || printf('%g', rating) || '/10' || COALESCE(' · ' || NULLIF(review_text, ''), ''),
      created_at, created_at, created_at
    FROM user_ratings
    WHERE title_id IN (SELECT title_id FROM user_ratings GROUP BY title_id HAVING COUNT(*) > 1)`,
  `UPDATE user_ratings
    SET rating = (SELECT ROUND(AVG(r.rating)) FROM user_ratings r WHERE r.title_id = user_ratings.title_id)
    WHERE id IN (SELECT MAX(id) FROM user_ratings GROUP BY title_id HAVING COUNT(*) > 1)`,
  `DELETE FROM user_ratings WHERE id NOT IN (SELECT MAX(id) FROM user_ratings GROUP BY title_id)`,
  `DELETE FROM watch_history WHERE id NOT IN (SELECT MAX(id) FROM watch_history GROUP BY title_id)`,
];
