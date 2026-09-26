# What to Watch — UI/UX

Product reasoning: `DESIGN.md`. Glyphs: `uiux` skill `notation.md`. Width 60.

## Screen map

```
   Launch
     │
     ▼
 ┌ Home ───────────┐──tap card──▶ Show Detail
 │ search bar ─────┼──type──▶ Search overlay ──tap──▶ Show Detail
 │ Filters & Sort ─┼──tap──▶ Filter sheet
 │ Settings (inline)│
 └─────────────────┘◀──back──── Show Detail
```

Home is one scroll page; Settings stays inline at the bottom (few rows, no page earned). Filter = sheet (list filter, not a form field — per `mobile.md`).

## Home

```
RECENTLY WATCHED
┌────┐┌────┐┌────┐
│    ││    ││    │                 ← poster cards, h-scroll
└────┘└────┘└────┘
Dune: Part Two  Severance  The Be…  ← 1 line, truncate

MY RATINGS & REVIEWS
┌────┐┌────┐
│    ││    │
└────┘└────┘
Dune: Pa…  Past Lives
8.5 ★      9.0 ★

[ Filters & Sort · 3 ]  ( Reset )   ← count = non-default filters

NETFLIX                                     ⟳ ← refresh
Most Popular
┌────┐┌────┐┌────┐┌────┐
│    ││    ││    ││    │
└────┘└────┘└────┘└────┘
Wednesday  The Night…  Squid G…
#1         #2          #3            ← original rank kept when filtered

APPLE TV+
…

SETTINGS
…
─────────────────────────────────
│ 🔍 Search titles, cast, genres  │ ← pinned bottom
```

### States (per platform section)

```
no TMDB key  Add a TMDB API key in Settings to see Netflix rankings.
loading      ⟳ Loading Netflix…
error        ⚠ Couldn't load Netflix rankings.      ( Retry )
filtered 0   No Netflix titles match your filters.  ( Reset filters )
populated    (row above)
```

Recently Watched / My Ratings empty copy unchanged from code.

## Filter sheet

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
Filters & Sort                          ( Reset )  ( Done )

SORT
[ POPULAR | Rating | Year | Title ]   [ ↓ High first ]  ← ↑/↓; hidden for Popular

RATING (0-100)
┌──────┐  to  ┌──────┐
│ 60   │      │ 100  │
└──────┘      └──────┘

WATCHED AT LEAST
[−]  0  [+]                              ← times

YEAR
┌──────┐  to  ┌──────┐
│ 2000 │      │ 2026 │
└──────┘      └──────┘

GENRE                                     ← from cached titles
[Action] [COMEDY] [Drama] [Sci-Fi] [Thriller] …   wrap

COUNTRY OF ORIGIN
[US] [GB] [KR] [JP] [FR] …                ← codes present in cache

LANGUAGE
[EN] [KO] [JA] [ES] …

CAST
┌──────────────────────────────────┐
│ Actor name                       │     ← comma-separated, contains-match
└──────────────────────────────────┘
```

Chip selected = filled dark, white text. Chip lists show only values present in cached titles; empty list → `Open a few titles first.` in grey.

Multi-select within a group = OR; across groups = AND.

## Search overlay

```
│ dune▌                         │
─────────────────────────────────
IN YOUR LIBRARY
┌────┐┌────┐┌────┐
│    ││    ││    │
└────┘└────┘└────┘
Dune   Dune: Pa…

ONLINE (TMDB)
Dune: Part Two · 2024 · Movie        ›
Dune · 2021 · Movie                  ›
Dune: Prophecy · 2024 · TV           ›
```

```
typing      online list debounced 400 ms
loading     ⟳ Searching TMDB…
no key      Add a TMDB API key in Settings to search online.
error       ⚠ Online search failed.
empty       No results for "xqzt"
tap online  row shows ⟳ → fetch + cache → Show Detail
```

## Show Detail

```
┌────┐  Dune: Part Two
│    │  2024 · 166 min · Movie
│    │  Science Fiction, Adventure
└────┘  US · EN
Paul Atreides unites with Chani and the Fremen…

[[ Mark watched ]]  ( Watching )  ( Dropped )
Watched 2× · last Sep 25, 2026           ← after marking

CAST
Timothée Chalamet, Zendaya, Rebecca Ferguson, …

NOTES …
MY RATING & REVIEW …
INTERNET REVIEWS & RATINGS
[TMDB 8.2/10] [IMDb 8.5/10] [RT 92%]
WHERE TO WATCH (US)
[Max] [Apple TV (rent)]
```

```
not cached   ⟳ Fetching details…  then renders
fetch error  ⚠ Couldn't load this title.  ( Retry )
```

## Settings → Backup

Replaces the old "Sync to iCloud" toggle and "Import / Export" block.

```
BACKUP ⓘ
iCloud Drive                                         ─●
Files → iCloud Drive → What to Watch · 4 min ago
─────────────────────────────────────────────────────
Export a copy…                                        ›  ← share sheet
Import from file…                                     ›  ← picker → confirm
```

ⓘ popover: "Your ratings, reviews, notes and watch history. API keys never leave this device, including in backups. A daily copy is also kept in Files → On My iPhone → What to Watch."

### iCloud row states

```
unsupported   (row hidden — Android / no native module)
off           iCloud Drive                                 ○─
              Files → iCloud Drive → What to Watch
on, done      iCloud Drive                                 ─●
              Files → iCloud Drive → What to Watch · 4 min ago
on, working   iCloud Drive                                 ─●
              ⟳ Backing up…
on, failed    iCloud Drive                                 ─●
              ⚠ Last backup failed: <native message>
drive off     iCloud Drive                                 ○─·
              iCloud Drive is off on this device
              Settings → your name → iCloud → iCloud Drive → turn on   ← accent
not entitled  iCloud Drive                                 ○─·
              This build of the app isn't signed for iCloud
not ready     iCloud Drive                                 ○─·
              iCloud is still setting up — try again shortly
```

Re-checked on app foreground.

### Import confirm

```
 ┌────────────────────────────────────────┐
 │  Replace your data with this file?     │
 │  Your current data is saved first to   │
 │  Files → On My iPhone → What to Watch. │
 │          ( Cancel )  [[ Replace ]]     │!
 └────────────────────────────────────────┘
done   ⌐ Imported 12 ratings, 3 notes, 20 watched ¬      ← alert, one line
error  ⚠ Import failed: <reason>
```

## Components & copy

| Key | String |
|---|---|
| filters.trigger | Filters & Sort |
| filters.reset | Reset |
| filters.chips.empty | Open a few titles first. |
| platform.filteredEmpty | No {platform} titles match your filters. |
| platform.error | Couldn't load {platform} rankings. |
| search.online.header | Online (TMDB) |
| search.online.noKey | Add a TMDB API key in Settings to search online. |
| detail.markWatched | Mark watched |
| backup.heading | Backup |
| backup.icloud.location | Files → iCloud Drive → What to Watch |
| backup.export | Export a copy… |
| backup.import | Import from file… |
| backup.import.confirm | Replace your data with this file? |

## Deviations from the `uiux` skill

None.
