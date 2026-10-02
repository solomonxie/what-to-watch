import { MIGRATIONS } from '../src/db/migrations';

describe('merging duplicate ratings', () => {
  it('keeps one averaged rating and turns each into a dated mark', () => {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(':memory:');
    const run = (steps: string[][]) =>
      steps.flat().forEach((s: string) => db.exec(s));
    run(MIGRATIONS.slice(0, 8));
    const rate = db.prepare(
      'INSERT INTO user_ratings (title_id, rating, review_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    );
    rate.run('tv:1', 10, 'great', 100, 100);
    rate.run('tv:1', 10, null, 200, 200);
    rate.run('tv:1', 7, '', 300, 300);
    rate.run('movie:2', 8, 'solo', 400, 400);
    const watch = db.prepare(
      'INSERT INTO watch_history (title_id, watched_at, status) VALUES (?, ?, ?)',
    );
    watch.run('tv:1', 100, 'completed');
    watch.run('tv:1', 200, 'completed');

    run(MIGRATIONS.slice(8, 9));

    expect(
      db
        .prepare('SELECT title_id, rating FROM user_ratings ORDER BY title_id')
        .all(),
    ).toEqual([
      { title_id: 'movie:2', rating: 8 },
      { title_id: 'tv:1', rating: 9 },
    ]);
    expect(
      db
        .prepare('SELECT body, marked_at FROM user_notes ORDER BY marked_at')
        .all(),
    ).toEqual([
      { body: 'Rated 10/10 · great', marked_at: 100 },
      { body: 'Rated 10/10', marked_at: 200 },
      { body: 'Rated 7/10', marked_at: 300 },
    ]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM watch_history').get()).toEqual(
      { n: 1 },
    );
  });
});
