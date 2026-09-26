# What to Watch — MVP design

## Problem

Deciding what to watch means hopping between streaming apps, IMDb and personal notes. The scaffold has the screens and local DB, but nothing ever fetches or caches titles: search only hits an empty local index, platform rows are always empty, filters apply to nothing, and there's no way to mark a title watched.

## Goals

- Search any movie/show online (TMDB), open it, and have it cached locally.
- Per-platform "Most Popular" rows (Netflix, Apple TV+, …) for the user's region.
- Filters that actually narrow those rows: rating, watch count, genre, year, region (country of origin), language, cast.
- Personal layer on each title: watched status, rating/review, notes.
- Personal data survives phone loss / reinstall: local snapshots + iCloud Drive backup, auto-restore on fresh install.
- Installable on the owner's iPhone for review.

## Non-goals

- Accounts / server backend (the `deprecated/` Go + ETL scaffold stays unused).
- Multi-device merge sync — iCloud Drive is one-way backup, never live DB.
- Per-row change log, raw `.db` snapshots, S3/bucket tier — data is small JSON; revisit if it grows.
- Android polish beyond "builds and runs".
- Trending/charts beyond one "Most Popular" row per platform.

## Options considered

- **Rankings source:** TMDB `discover` with `with_watch_providers` + `watch_region` (free, one call per platform) vs. scraping platform top-10 pages (brittle, ToS) vs. JustWatch API (no public API). → TMDB.
- **Filter where:** in SQL (fast, but JSON columns for genres/cast/countries are awkward in SQLite) vs. in JS over cached rows (≤ a few hundred titles). → JS, reuse `applyFilters`.
- **"Region" filter meaning:** streaming region (already a setting, fixes which catalogue you see) vs. country of origin. → Country of origin; streaming region stays in Settings.
- **Cast data:** separate cast table vs. JSON array of top-billed names on the title. → JSON array; only used for filter + display.
- **Schema change:** drizzle-kit migrator (needs bundling .sql in Metro) vs. hand-rolled `PRAGMA user_version` steps. → user_version, matches existing `INIT_STATEMENTS` approach.
- **Backup target:** CloudKit records (current stub; needs schema + merge) vs. iCloud Drive file (zero setup, user can see/copy it). → iCloud Drive file, per `uiux` `platform-cloud-drive.md`.

## Decision

TMDB is the backbone (search, details, credits, watch providers, discover). OMDb, when a key exists, only adds IMDb/RT/Metacritic ratings via the IMDb id. Everything fetched lands in SQLite; UI reads only from SQLite, so screens work offline once cached. Rankings cached 12 h (existing TTL).

## Data & integrations

- New `cached_titles` columns: `original_language`, `origin_countries` (JSON), `cast_names` (JSON).
- TMDB calls per opened title: details (`append_to_response=credits,watch/providers`) = 1 call; + 1 OMDb call if keyed.
- Per platform refresh: 1 discover call (20 titles). Free tier limits (~50 req/s) are not a concern.
- API keys: Keychain only (unchanged), never in export.

## Backup

Per `uiux` `backup-restore.md` + `platform-cloud-drive.md`.

- Payload: one JSON (`version: 2`) — notes, ratings, watch history, settings, plus the `cached_titles` rows they reference (so restored lists render without a key). Never API keys; the old "include API keys" export option is removed.
- Tier 1, app Documents (Files-visible, dies with app): `what-to-watch-daily.json` (overwritten daily) + `what-to-watch-before-import-<ts>.json` before any import. Pruned by age, 7 days.
- Tier 2, iCloud Drive `Files → iCloud Drive → What to Watch`: `YYYYMMDD-what-to-watch.json`, one per day, keep latest 10. One switch; flip-on backs up immediately.
- Cadence: on app background, at most daily, only if payload hash changed; hash recorded per destination only after a successful write.
- Restore: fresh install (no user data, flag unset) auto-pulls latest iCloud backup once, silently. Manual path = file picker import; it snapshots tier 1 first, then replaces.
- iCloud status: unsupported (hide row) / notEntitled / driveOff / notReady / available — entitlement checked first via `embedded.mobileprovision`.

## Risks / open questions

- TMDB discover popularity ≠ platform's own Top 10; acceptable for MVP.
- iCloud container must be registered for the bundle id (auto via `-allowProvisioningUpdates` on the paid team).
- Import replaces the single dataset instead of creating a new one (app has one dataset); the before-import snapshot is the undo.
