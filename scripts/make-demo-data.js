#!/usr/bin/env node
// Builds demo/library.json: a realistic library (TMDB metadata, watch history,
// ratings, episodes, notes, taste) for the demo app. Needs TMDB_API_KEY in the
// environment, .env.demo or .env.local.
//   node scripts/make-demo-data.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DAY = 24 * 60 * 60 * 1000;
// Must match DEMO_EPOCH in src/demo/dataStore.ts; seeding shifts dates to now.
const EPOCH = Date.parse('2026-10-01T12:00:00Z');
const at = (daysAgo, hour = 21) =>
  EPOCH - daysAgo * DAY + (hour - 12) * 60 * 60 * 1000;

function key() {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY;
  for (const file of ['.env.demo', '.env.local']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^TMDB_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  throw new Error('TMDB_API_KEY not found');
}

const API_KEY = key();
async function tmdb(p, params = {}) {
  const q = new URLSearchParams({ api_key: API_KEY, ...params });
  const res = await fetch(`https://api.themoviedb.org/3${p}?${q}`);
  if (!res.ok) throw new Error(`${p}: ${res.status}`);
  return res.json();
}

// [type, title, year, status, rating (1–10), review, daysAgo]
const LIBRARY = [
  ['movie', 'Dune: Part Two', 2024, 'completed', 9, 'Huge, strange and gorgeous. The arena scene alone.', 12],
  ['movie', 'Past Lives', 2023, 'completed', 10, 'Quiet and devastating. Stayed with me for days.', 20],
  ['movie', 'Oppenheimer', 2023, 'completed', 8, null, 34],
  ['movie', 'Everything Everywhere All at Once', 2022, 'completed', 9, 'Hot dog fingers made me cry. Somehow.', 41],
  ['movie', 'Parasite', 2019, 'completed', 10, null, 55],
  ['movie', 'Spider-Man: Across the Spider-Verse', 2023, 'completed', 9, null, 62],
  ['movie', 'The Holdovers', 2023, 'completed', 8, 'A new Christmas rewatch.', 70],
  ['movie', 'Arrival', 2016, 'completed', 9, null, 84],
  ['movie', 'Knives Out', 2019, 'completed', 8, null, 90],
  ['movie', 'Top Gun: Maverick', 2022, 'completed', 7, null, 101],
  ['movie', 'Anatomy of a Fall', 2023, 'completed', 8, null, 115],
  ['movie', 'Decision to Leave', 2022, 'completed', 8, null, 128],
  ['movie', 'The Batman', 2022, 'completed', 6, 'Looks great, an hour too long.', 140],
  ['movie', 'Barbie', 2023, 'completed', 7, null, 150],
  ['movie', 'Poor Things', 2023, 'toWatch', null, null, 3],
  ['movie', 'Conclave', 2024, 'toWatch', null, null, 6],
  ['movie', 'Perfect Days', 2023, 'toWatch', null, null, 9],
  ['movie', 'The Zone of Interest', 2023, 'toWatch', null, null, 15],
  ['movie', 'Anora', 2024, 'toWatch', null, null, 18],
  ['movie', 'Civil War', 2024, 'toWatch', null, null, 26],
  ['tv', 'Severance', 2022, 'watching', 10, null, 1, 0.7],
  ['tv', 'The Bear', 2022, 'watching', 9, null, 2, 0.6],
  ['tv', 'Shōgun', 2024, 'watching', null, null, 4, 0.5],
  ['tv', 'Slow Horses', 2022, 'watching', 9, 'Gary Oldman having the time of his life.', 8, 0.65],
  ['tv', 'Andor', 2022, 'watching', null, null, 22, 0.4],
  ['tv', 'Breaking Bad', 2008, 'completed', 10, null, 200, 1],
  ['tv', 'Chernobyl', 2019, 'completed', 10, null, 170, 1],
  ['tv', 'Fleabag', 2016, 'completed', 9, null, 160, 1],
  ['tv', 'Succession', 2018, 'completed', 9, null, 120, 1],
  ['tv', 'Dark', 2017, 'completed', 8, 'Keep a notebook for the family trees.', 95, 1],
  ['tv', 'Citadel', 2023, 'dropped', 4, null, 75, 0.3],
  ['tv', 'Pachinko', 2022, 'toWatch', null, null, 5],
  ['tv', 'The White Lotus', 2021, 'toWatch', null, null, 11],
  ['tv', 'Ripley', 2024, 'toWatch', null, null, 30],
];

const NOTES = {
  Severance: 'Rewatch S1 finale before the new season.',
  'Perfect Days': 'Recommended by Mia — watch on a slow Sunday.',
  Shōgun: 'Subtitles on, not dubbed.',
};

const pick = (list, year, field) =>
  list.find(r => (r[field] || '').startsWith(String(year))) ?? list[0];

async function find(type, title, year) {
  const data = await tmdb(`/search/${type}`, {
    query: title,
    ...(type === 'movie' ? { year } : { first_air_date_year: year }),
  });
  const hit = pick(data.results, year, type === 'movie' ? 'release_date' : 'first_air_date');
  if (!hit) throw new Error(`Not found: ${title}`);
  return hit.id;
}

function certificationOf(type, d) {
  const us =
    type === 'movie'
      ? d.release_dates?.results.find(r => r.iso_3166_1 === 'US')?.release_dates.find(x => x.certification)?.certification
      : d.content_ratings?.results.find(r => r.iso_3166_1 === 'US')?.rating;
  return us ?? '';
}

async function details(type, id) {
  const d = await tmdb(`/${type}/${id}`, {
    language: 'en-US',
    append_to_response: `credits,external_ids,${type === 'movie' ? 'release_dates' : 'content_ratings'}`,
  });
  return {
    row: {
      id: `${type}:${id}`,
      tmdbId: String(id),
      omdbId: null,
      imdbId: d.imdb_id ?? d.external_ids?.imdb_id ?? null,
      title: d.title ?? d.name,
      originalTitle: d.original_title ?? d.original_name,
      posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w342${d.poster_path}` : null,
      overview: d.overview || null,
      releaseDate: d.release_date || d.first_air_date || null,
      genres: d.genres.map(g => g.name),
      runtimeMinutes: d.runtime || d.episode_run_time?.[0] || null,
      mediaType: type,
      primaryRatingScore: d.vote_count ? Math.round(d.vote_average * 100) / 10 : null,
      originalLanguage: d.original_language,
      originCountries: d.origin_country ?? d.production_countries?.map(c => c.iso_3166_1) ?? [],
      castNames: (d.credits?.cast ?? []).slice(0, 10).map(c => c.name),
      certification: certificationOf(type, d),
      fetchedAt: EPOCH,
    },
    seasons: (d.seasons ?? [])
      .filter(s => s.season_number > 0 && s.episode_count > 0)
      .map(s => [s.season_number, s.episode_count]),
    lastAired: d.last_episode_to_air,
  };
}

function episodesFor(titleId, seasons, lastAired, share, daysAgo) {
  const aired = seasons.flatMap(([season, count]) =>
    Array.from({ length: count }, (_, i) => ({ season, episode: i + 1 })),
  ).filter(
    e =>
      !lastAired ||
      e.season < lastAired.season_number ||
      (e.season === lastAired.season_number && e.episode <= lastAired.episode_number),
  );
  const watched = aired.slice(0, Math.max(1, Math.round(aired.length * share)));
  return watched.map((e, i) => ({
    titleId,
    ...e,
    watchedAt: at(daysAgo + (watched.length - 1 - i) * 2),
  }));
}

async function main() {
  const titles = [];
  const watchHistory = [];
  const ratings = [];
  const episodes = [];
  const notes = [];
  for (const [type, name, year, status, rating, review, daysAgo, share] of LIBRARY) {
    const id = await find(type, name, year);
    const { row, seasons, lastAired } = await details(type, id);
    titles.push(row);
    watchHistory.push({
      titleId: row.id,
      status,
      watchedAt: at(daysAgo),
      rewatchCount: status === 'completed' ? 1 : 0,
    });
    if (rating)
      ratings.push({
        titleId: row.id,
        rating,
        reviewText: review,
        createdAt: at(daysAgo, 23),
        updatedAt: at(daysAgo, 23),
      });
    if (type === 'tv' && share)
      episodes.push(...episodesFor(row.id, seasons, lastAired, share, daysAgo));
    if (NOTES[name])
      notes.push({ titleId: row.id, body: NOTES[name], createdAt: at(daysAgo, 20), updatedAt: at(daysAgo, 20) });
    process.stdout.write(`${row.id} ${row.title}\n`);
  }
  const topics = [];
  for (const q of ['time travel', 'heist']) {
    const k = (await tmdb('/search/keyword', { query: q })).results.find(r => r.name === q);
    if (k) topics.push({ id: k.id, name: k.name });
  }
  const payload = {
    version: 2,
    exportedAt: new Date(EPOCH).toISOString(),
    notes,
    ratings,
    watchHistory,
    episodes,
    settings: {
      enabledPlatformIds: ['netflix', 'appletv', 'hbomax', 'primevideo', 'disneyplus'],
      icloudSyncEnabled: false,
      defaultRegion: 'US',
      defaultLanguage: 'en-US',
      filterDefaults: null,
    },
    titles,
    preferences: {
      genres: ['Science Fiction', 'Thriller', 'Drama', 'Crime', 'Comedy'],
      topics,
      languages: ['en', 'ko', 'ja'],
      countries: [],
      mediaTypes: 'both',
      onlyMyServices: true,
    },
  };
  const out = path.join(ROOT, 'demo', 'library.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload, null, 1) + '\n');
  console.log(`${titles.length} titles, ${episodes.length} episodes → ${path.relative(ROOT, out)}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
