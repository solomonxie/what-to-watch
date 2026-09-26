# What to Watch — MVP implementation plan

Design: `DESIGN.md` · UI: `UIUX_DESIGN.md`.

## Phase 0: Scaffold

RN app, local DB, providers, screens — already in the repo.

- [x] T0.1 RN app + navigation + screens — see `src/screens` — depends: none
- [x] T0.2 SQLite schema + repos — see `src/db` — depends: none
- [x] T0.3 TMDB/OMDb/IMDb providers + merge — see `src/providers` — depends: none
- [x] T0.4 Settings: API keys, platforms, iCloud toggle stub, import/export — see `src/components/settings` — depends: none

## Phase 1: Device build baseline

Nothing else can be reviewed until it installs on the phone.

- [x] T1.1 Lazy DB open, `import React` in Swift module, app icons — see `src/db/client.ts`, `ios/` — depends: none
- [x] T1.2 Team ID + bundle id out of tracked pbxproj → `ios/Signing.xcconfig` + gitignored `ios/Local.xcconfig` — see `ios/` — depends: none

## Phase 2: Data model

Filters and ingestion both need the new title fields, so the schema lands first.

- [x] T2.1 Domain + schema fields: `originalLanguage`, `originCountries`, `cast`; `user_version` migration step; `app_kv` table for backup state — see `src/types`, `src/db` — depends: none

## Phase 3: Ingestion

Fill the DB. Everything UI-side reads from SQLite only.

- [x] T3.1 TMDB provider: media-type-aware endpoints, `append_to_response`, discover by platform, genre map — see `src/providers/tmdbProvider.ts` — depends: T2.1
- [x] T3.2 Catalog service: `fetchAndCacheTitle`, `refreshPlatformRanking`, `searchOnline` — see `src/catalog` — depends: T3.1

## Phase 4: UI wiring

Consumers of Phase 3; separate files, parallelizable.

- [x] T4.1 Filters: `applyFilters` for region/language/cast; full filter sheet; active count + reset — see `src/state/filterStore.ts`, `src/components/home/FiltersEntryPoint.tsx`, UIUX "Filter sheet" — depends: T2.1
- [x] T4.2 Platform sections: refresh via catalog, states, apply filters + sort, use settings region — see `src/components/home/PlatformSection.tsx`, UIUX "Home" — depends: T3.2, T4.1
- [x] T4.3 Search overlay: online TMDB results, tap → cache → detail — see `src/components/search`, UIUX "Search overlay" — depends: T3.2
- [x] T4.4 Detail: fetch if missing, watched buttons, cast + origin line — see `src/screens/detail`, `src/components/detail`, UIUX "Show Detail" — depends: T3.2
- [x] T4.5 Home refresh on focus (sections reload after returning from Detail) — see `src/screens/HomeScreen.tsx` — depends: T4.2

## Phase 4b: Backup

Independent of Phases 3-4 (touches only backup/settings/native files); runs in parallel with them.

- [x] T4b.1 Native iCloud Drive module: status (entitlement-first), write + prune 10, read latest; entitlements + `NSUbiquitousContainers` — see `ios/WhatToWatch/ICloudSync` — depends: T1.2
- [x] T4b.2 Backup service: payload v2 (no keys), tier-1 daily + before-import, 7-day prune, hash gate, background trigger, fresh-install restore — see `src/backup` — depends: T2.1
- [x] T4b.3 Settings "Backup" UI: iCloud row states, export/import rows, confirm — see `src/components/settings`, UIUX "Settings → Backup" — depends: T4b.1, T4b.2

## Phase 5: Verify & ship to device

- [x] T5.1 Unit tests for new filters + migration steps; `tsc`, `jest` green — see `__tests__` — depends: T4.1
- [x] T5.2 Release build installed on physical iPhone — see `ios/` — depends: all above

## Phase 6: Redesign

First review on device: Settings buried the content, no platform rows (DB raw-row bug), dated look. Rebuild the UI on native tabs + a small token set; data layer unchanged.

- [x] T6.1 Theme tokens (light/dark) + primitives: PosterCard, Chip, Segmented, GroupedSection/Row, EmptyState — see `src/ui` — depends: none
- [x] T6.2 Navigation: native tabs (Discover / Library / Settings), per-tab stacks, header search, Filters form sheet — see `src/navigation` — depends: T6.1
- [x] T6.3 Discover: platform pills, poster grid, states, search results — see `src/screens/discover` — depends: T6.2
- [x] T6.4 Library: segmented watched/watching/rated grid — see `src/screens/library` — depends: T6.2
- [x] T6.5 Title: stat row, status segmented, instant rating/review, notes — see `src/screens/title` — depends: T6.2
- [x] T6.6 Settings: grouped list, API key page with verify, region page, backup rows — see `src/screens/settings` — depends: T6.2
- [x] T6.7 Remove old home/detail/settings components; tsc/jest/eslint; device build — depends: T6.3-T6.6

## Phase 7: Taste & recommendations

The profile is the input everything else reads, so its model and store land first; the recommender is pure logic, testable before any UI.

- [x] T7.1 Taxonomy (genres with movie/tv TMDB ids, languages, countries) + preferences store persisted in `app_kv` — see `src/config/taxonomy.ts`, `src/prefs` — depends: none
- [x] T7.2 TMDB: generic discover with params, keyword search — see `src/providers/tmdbProvider.ts` — depends: none
- [x] T7.3 Recommender: query plan + rank-weighted scoring + reasons (pure, unit-tested) — see `src/recs/recommender.ts` — depends: T7.1
- [x] T7.4 Recs service: run plan, exclude watched/dropped, cache in kv, stale-while-revalidate — see `src/recs/recsService.ts` — depends: T7.2, T7.3
- [x] T7.5 Draggable ranked list (PanResponder, no native deps) — see `src/ui/RankedList.tsx` — depends: none
- [x] T7.6 Taste + Add-facet screens; For You tab; Settings row — see `src/screens/forYou`, `src/screens/taste`, UIUX "For You", "Taste" — depends: T7.1, T7.4, T7.5
- [x] T7.8 "To watch" status: domain, title segmented, Library tab — see `src/screens/library`, `src/screens/title` — depends: none
- [x] T7.7 Preferences in backup payload; live test for recs — see `src/backup`, `__tests__` — depends: T7.4

## Phase 8: Reach & links

Review feedback: search should be reachable from anywhere, titles should link out, and existing history elsewhere should come in.

- [x] T8.1 Floating search pill over tabs + full-screen search modal — see `src/screens/search` — depends: none
- [x] T8.2 Provider logo/link columns (migration 3); "Watch on / More on" icons — see `src/config/links.ts`, `src/screens/title` — depends: none
- [x] T8.3 Library import: CSV formats, RSS feeds, TMDB matcher, merge rules, Import screen — see `src/libraryImport`, `src/screens/library/ImportScreen.tsx` — depends: none
- [x] T8.4 Filters as card modal (form sheet laid out wrongly) — see `src/navigation` — depends: none
- [x] T8.5 Unit + live tests for recs and import — see `__tests__` — depends: T8.3

## Phase 9: One home

Review feedback: no separate For You page — Discover shows popular by default and switches to picks once a taste exists.

- [x] T9.1 Recs scoped per service (+ All), cache per scope — see `src/recs/recsService.ts` — depends: none
- [x] T9.2 Discover feed: All chip, popular vs picks, stale-while-revalidate, reasons — see `src/screens/discover` — depends: T9.1
- [x] T9.3 Remove For You tab; Taste only from Settings — see `src/navigation` — depends: T9.2
