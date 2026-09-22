# What to Watch

Cross-platform (iOS/Android) React Native app for deciding what to watch — fuzzy search, per-streaming-platform rankings, and filters (rating, watch count, genre, year, region, language, cast) across your own notes/ratings and metadata pulled from TMDB/OMDb/IMDb.

## Stack

Bare React Native (TypeScript), React Navigation, Zustand, op-sqlite + Drizzle ORM, react-native-keychain, Fuse.js.

## Structure

- `src/providers` — TMDB/OMDb/IMDb metadata providers + merge/normalization
- `src/db` — local SQLite schema, client, repositories
- `src/state` — filter/sort and settings stores
- `src/screens`, `src/components` — Home (sections + persistent search + settings) and Show Detail
- `src/native` — iCloud sync bridge (iOS only; Android placeholder)
- `deprecated/` — archived earlier backend scaffold, unused

## Local dev

```sh
npm install
cd ios && pod install && cd ..
npm run ios       # or: npm run android
```

Add a TMDB and/or OMDb API key in the app's Settings section to enable metadata, ratings, and platform rankings.
