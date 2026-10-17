# What to Watch

Cross-platform (iOS/Android) React Native app for deciding what to watch — fuzzy search, per-streaming-platform rankings, and filters (rating, watch count, genre, year, region, language, cast) across your own notes/ratings and metadata pulled from TMDB/OMDb/IMDb.

## Stack

Bare React Native (TypeScript), React Navigation, Zustand, op-sqlite + Drizzle ORM, react-native-keychain, Fuse.js.

## Structure

- `src/providers` — TMDB/OMDb/IMDb metadata providers + merge/normalization
- `src/db` — local SQLite schema, client, repositories
- `src/state` — filter/sort and settings stores
- `src/screens`, `src/components` — Home (sections + persistent search + settings) and Show Detail
- `src/catalog` — fetch/cache titles, platform rankings, online search
- `src/backup` — local + iCloud Drive backup, import/export
- `src/native` — iCloud Drive and Spotlight bridges (iOS only)
- `src/demo`, `demo/` — demo mode and its preset library
- `deprecated/` — archived earlier backend scaffold, unused

## Local dev

```sh
npm install
cd ios && pod install && cd ..
npm run ios       # Release build → connected iPhone (no Metro server)
```

iOS signing: create gitignored `ios/Local.xcconfig` with your `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER` (placeholders in `ios/Signing.xcconfig`). iCloud Drive backup needs a paid team; the container `iCloud.<bundle id>` is registered automatically with `-allowProvisioningUpdates`.

Install a release build on a connected iPhone:

```sh
cd ios
xcodebuild -workspace WhatToWatch.xcworkspace -scheme WhatToWatch -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath /tmp/whattowatch-build/dd -allowProvisioningUpdates build
xcrun devicectl device install app --device <UDID> /tmp/whattowatch-build/dd/Build/Products/Release-iphoneos/WhatToWatch.app
```

Store region: `make ios STORE=cn` / `make release STORE=cn` (default `us` = Canada/US). Written to gitignored `ios/Install.xcconfig` → Info.plist `AppStoreRegion` → `storeRegion()` (`src/config/storeRegion.ts`). Plain `xcodebuild`/Xcode builds use the last one written, else `us`.

App Store: `make release` archives and uploads; every listing field, the privacy policy and the checklist are in `docs/release/`. `make help` lists the rest.

Import history: Settings → Import data → IMDb CSV… / Letterboxd CSV… take those exports as-is; Other CSV… reads any CSV with a `title` column (optional `year, imdb, tmdb, type, status, rating (0.5–5), review, date`). A row with `tmdb` + `type` matches exactly.

Douban (no official export) → a CSV pinned to TMDB ids:

```sh
python3 scripts/douban-export.py <profile id> -o ~/Downloads/douban.csv
MATCH_CSV=~/Downloads/douban.csv MATCH_OUT=~/Downloads/douban-matched.csv npx jest scripts/match-csv.test.js
# misses only: IMDb ids from their Douban pages, then match again
python3 scripts/douban-export.py <profile id> -o ~/Downloads/douban.csv --from ~/Downloads/douban.csv \
  --imdb-for ~/Downloads/douban-matched.unmatched.csv
MATCH_CSV=~/Downloads/douban.csv MATCH_OUT=~/Downloads/douban-matched.csv npx jest scripts/match-csv.test.js
```

Import `douban-matched.csv` with Other CSV…; `douban-matched.unmatched.csv` lists what TMDB doesn't have.

Live end-to-end test (real TMDB/OMDb, SQLite via `node:sqlite`) — keys from env or gitignored `.env.local` (`TMDB_API_KEY=…`, `OMDB_API_KEY=…`); skipped without them:

```sh
npx jest __tests__/liveApis.test.ts
```

Design + plan: `docs/design/mvp/`.

Add a TMDB and/or OMDb API key in the app's Settings section to enable metadata, ratings, and platform rankings.

## Demo

- Settings → Demo mode: own database and API-key slot; backups, iCloud and Spotlight stay off; switching back shows the real data untouched. "Reset demo data" starts over.
- Preset library: `demo/library.json` (backup format, dates shifted to today on first launch). Regenerate: `node scripts/make-demo-data.js`.
- Keys: `.env.demo` (copy `.env.demo.example`), baked in by `make ios` only (never `make release`); used only in demo mode. Order: key set in demo mode → `.env.demo` → real key (read only).
- Screenshots in demo mode: `DEMO=1 scripts/screenshot.sh discover /tmp/out.png` (`-demoMode 1` launch argument, that run only).
- Simulator screenshots: see docs/release/listing.md → Screenshots (`SCREENSHOTS` build flag, `-openURL` launch argument).

## Spotlight

Every cached title (library, browsed, rankings, picks) is indexed in iOS Spotlight via `CoreSpotlight`; tapping a result opens its page (`whattowatch://title/<id>`). Synced in the background as titles or the library change — only changed items are sent, everything again weekly.

## Screenshots

| **Discover** · picks on your services | **Title** · your rating, where to find it | **Library** · continue, next, top rated |
|:-:|:-:|:-:|
| <img src="docs/release/screenshots/01-discover.jpg" width="250"> | <img src="docs/release/screenshots/02-title.jpg" width="250"> | <img src="docs/release/screenshots/03-library.jpg" width="250"> |
| **Filters** · type, year, rating, age | **Search** · library and TMDB as you type | **Taste** · rank what drives picks |
| <img src="docs/release/screenshots/04-filters.jpg" width="250"> | <img src="docs/release/screenshots/05-search.jpg" width="250"> | <img src="docs/release/screenshots/06-taste.jpg" width="250"> |
| **Settings** · data sources, services |  |  |
| <img src="docs/release/screenshots/07-settings.jpg" width="250"> |  |  |
