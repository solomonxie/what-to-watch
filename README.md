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
- `src/native` — iCloud Drive bridge (iOS only)
- `deprecated/` — archived earlier backend scaffold, unused

## Local dev

```sh
npm install
cd ios && pod install && cd ..
npm run ios       # or: npm run android
```

iOS signing: create gitignored `ios/Local.xcconfig` with your `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER` (placeholders in `ios/Signing.xcconfig`). iCloud Drive backup needs a paid team; the container `iCloud.<bundle id>` is registered automatically with `-allowProvisioningUpdates`.

Install a release build on a connected iPhone:

```sh
cd ios
xcodebuild -workspace WhatToWatch.xcworkspace -scheme WhatToWatch -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build/dd -allowProvisioningUpdates build
xcrun devicectl device install app --device <UDID> build/dd/Build/Products/Release-iphoneos/WhatToWatch.app
```

Live end-to-end test (real TMDB/OMDb, SQLite via `node:sqlite`) — keys from env or gitignored `.env.local` (`TMDB_API_KEY=…`, `OMDB_API_KEY=…`); skipped without them:

```sh
npx jest __tests__/liveApis.test.ts
```

Design + plan: `docs/design/mvp/`.

Add a TMDB and/or OMDb API key in the app's Settings section to enable metadata, ratings, and platform rankings.
