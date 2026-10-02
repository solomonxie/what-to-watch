ALTER TABLE user_notes ADD COLUMN marked_at INTEGER;
UPDATE user_notes SET marked_at = created_at;
