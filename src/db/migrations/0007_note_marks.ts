// Notes became watch records: each carries when it was watched.
export const NOTE_MARKS_STATEMENTS: string[] = [
  'ALTER TABLE user_notes ADD COLUMN marked_at INTEGER',
  'UPDATE user_notes SET marked_at = created_at',
];
