import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const cachedTitles = sqliteTable('cached_titles', {
  id: text('id').primaryKey(),
  tmdbId: text('tmdb_id'),
  omdbId: text('omdb_id'),
  imdbId: text('imdb_id'),
  title: text('title').notNull(),
  originalTitle: text('original_title'),
  posterPath: text('poster_path'),
  overview: text('overview'),
  releaseDate: text('release_date'),
  genres: text('genres', { mode: 'json' }).$type<string[]>().notNull(),
  runtimeMinutes: integer('runtime_minutes'),
  mediaType: text('media_type').notNull(),
  primaryRatingScore: real('primary_rating_score'),
  originalLanguage: text('original_language'),
  originCountries: text('origin_countries', { mode: 'json' }).$type<string[]>(),
  castNames: text('cast_names', { mode: 'json' }).$type<string[]>(),
  certification: text('certification'),
  popularity: real('popularity'),
  fetchedAt: integer('fetched_at').notNull(),
});

export const cachedRatings = sqliteTable('cached_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  source: text('source').notNull(),
  rawValue: real('raw_value').notNull(),
  scale: text('scale').notNull(),
  normalizedValue: real('normalized_value').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

export const cachedWatchProviders = sqliteTable('cached_watch_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  platformId: text('platform_id').notNull(),
  platformName: text('platform_name').notNull(),
  region: text('region').notNull(),
  availabilityType: text('availability_type').notNull(),
  logoPath: text('logo_path'),
  link: text('link'),
  fetchedAt: integer('fetched_at').notNull(),
});

export const platformRankingsCache = sqliteTable('platform_rankings_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platformId: text('platform_id').notNull(),
  region: text('region').notNull(),
  category: text('category').notNull(),
  rank: integer('rank').notNull(),
  titleId: text('title_id').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
  ttlExpiresAt: integer('ttl_expires_at').notNull(),
});

export const userNotes = sqliteTable('user_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const userRatings = sqliteTable('user_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  rating: real('rating').notNull(),
  reviewText: text('review_text'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const watchHistory = sqliteTable('watch_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  watchedAt: integer('watched_at').notNull(),
  status: text('status').notNull(),
  rewatchCount: integer('rewatch_count').notNull().default(0),
});

export const episodeWatches = sqliteTable('episode_watches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: text('title_id').notNull(),
  season: integer('season').notNull(),
  episode: integer('episode').notNull(),
  watchedAt: integer('watched_at').notNull(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  enabledPlatformIds: text('enabled_platform_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull(),
  icloudSyncEnabled: integer('icloud_sync_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  defaultRegion: text('default_region').notNull().default('US'),
  defaultLanguage: text('default_language').notNull().default('en-US'),
  filterDefaults: text('filter_defaults', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
});

export const appKv = sqliteTable('app_kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const responseCache = sqliteTable('response_cache', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
  usedAt: integer('used_at').notNull(),
});
