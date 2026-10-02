-- Every mark carries a rating.
ALTER TABLE user_notes ADD COLUMN rating REAL;

-- "[Season N · ]Rated X/10[ · review]" marks become a rating plus the rest as review.
UPDATE user_notes
SET rating = CAST(substr(body, instr(body, 'Rated ') + 6, instr(substr(body, instr(body, 'Rated ') + 6), '/10') - 1) AS REAL),
  body = trim(
    rtrim(substr(body, 1, instr(body, 'Rated ') - 1), ' ·') ||
    CASE WHEN rtrim(substr(body, 1, instr(body, 'Rated ') - 1), ' ·') <> ''
      AND ltrim(substr(body, instr(body, '/10') + 3), ' ·') <> '' THEN ' · ' ELSE '' END ||
    ltrim(substr(body, instr(body, '/10') + 3), ' ·'))
WHERE body LIKE '%Rated %/10%';

-- Automatic action marks carried no rating; they go.
DELETE FROM user_notes
WHERE rating IS NULL AND (body = 'Interested' OR body LIKE 'Watched % of % episodes');

-- A rating with no rated mark becomes one.
INSERT INTO user_notes (title_id, body, rating, marked_at, created_at, updated_at)
SELECT r.title_id, COALESCE(r.review_text, ''), r.rating, r.updated_at, r.created_at, r.updated_at
FROM user_ratings r
WHERE NOT EXISTS (SELECT 1 FROM user_notes n WHERE n.title_id = r.title_id AND n.rating IS NOT NULL);

-- The title's rating is its latest mark's.
UPDATE user_ratings
SET rating = (SELECT n.rating FROM user_notes n WHERE n.title_id = user_ratings.title_id AND n.rating IS NOT NULL ORDER BY n.marked_at DESC, n.id DESC LIMIT 1),
  review_text = (SELECT n.body FROM user_notes n WHERE n.title_id = user_ratings.title_id AND n.rating IS NOT NULL ORDER BY n.marked_at DESC, n.id DESC LIMIT 1);
