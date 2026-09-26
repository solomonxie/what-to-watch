# What to Watch — UI/UX

Product reasoning: `DESIGN.md`. Glyphs: `uiux` skill `notation.md`. Width 60.

Principles: content first (posters, not forms) · one job per screen · system
components (native tabs, header search, form sheets, grouped lists) · light +
dark from one token set · no instructions on screen that a control can imply.

## Screen map

```
            ┌──────────── native tab bar ────────────┐
            │  Discover        Library       Settings│
            └────┬───────────────┬──────────────┬────┘
                 │               │              │
   search ◀──────┤               │              ├──▶ API key (push)
   Filters sheet ◀┤               │              └──▶ Region (push)
                 ▼               ▼
              Title ◀────────────┘              (Title pushes inside
                                                 the tab it came from)
```

## Discover (tab 1)

```
Discover                                    Filters·2  ← header right,
┌──────────────────────────────────────────────────┐     count if active
│ 🔍 Movies, shows, cast                            │ ← native search
└──────────────────────────────────────────────────┘
[[Netflix]] ( Apple TV+ ) ( Disney+ ) ( Max ) →      ← enabled platforms
                                                       h-scroll, 1 selected
MOST POPULAR · US
┌──────────┐ ┌──────────┐ ┌──────────┐
│1         │ │2         │ │3         │  ← rank badge
│  poster  │ │  poster  │ │  poster  │    2:3, radius 10
│          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
Wednesday    3 Body Pro…  Squid Game    ← 1 line
★ 8.4 · TV   ★ 7.5 · TV   ★ 7.9 · TV    ← secondary
…                                         pull to refresh
```

States (grid area):

```
no key     Connect TMDB to see what's streaming.   [[ Connect ]] → Settings/TMDB
loading    ⟳ (centered)
error      Couldn't load Netflix.                   [ Try again ]
filtered   Nothing matches your filters.            [ Clear filters ]
no plats   Pick your services in Settings.          [ Choose ]
```

### Search (header search focused)

```
│ 🔍 three body▌                         Cancel │
IN YOUR LIBRARY
┌──┐ 3 Body Problem
│  │ 2024 · TV · ★ 7.5                         ›
└──┘
ON TMDB
┌──┐ Three-Body
│  │ 2023 · TV                                  ›
└──┘
┌──┐ The Three-Body Problem
│  │ 2022 · TV                                 ⟳   ← opening
└──┘
```

```
typing   TMDB results debounced 350 ms, library results instant
no key   ON TMDB · Connect TMDB to search everything.
error    ON TMDB · ⚠ <provider message>   ( Retry )
empty    No results for "xqzt"
```

### Filters (form sheet, medium/large detents)

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
( Clear )            Filters                   ( Done )
SORT
[ POPULAR | Rating | Year | Title ]
MINIMUM RATING
( Any ) ( 6+ ) [[ 7+ ]] ( 8+ )                  ← chips, not fields
YEAR
( Any ) ( 2020s ) ( 2010s ) ( 2000s ) ( Older )
GENRE
( Action ) [[ Drama ]] ( Comedy ) ( Sci-Fi & Fantasy ) …
LANGUAGE
( EN ) ( KO ) ( JA ) ( ES ) …
COUNTRY
( US ) ( KR ) ( GB ) …
CAST
┌──────────────────────────────────────────┐
│ Actor name                               │
└──────────────────────────────────────────┘
```

Applies live (no Apply button). Chip lists = values present in cache;
empty → section hidden. Watch-count filter dropped from the sheet — Library
covers "what have I watched".

## Library (tab 2)

```
Library
[ WATCHED | Watching | Rated ]
┌──────────┐ ┌──────────┐ ┌──────────┐
│        2×│ │          │ │       ★9 │  ← badge: times / my rating
└──────────┘ └──────────┘ └──────────┘
Dune: Par…   Severance    Past Lives
```

```
empty watched   Titles you mark watched show up here.
empty watching  Nothing in progress.
empty rated     Rate a title to see it here.
```

## Title (pushed)

```
‹ Discover
┌────────────┐  3 Body Problem
│            │  2024 · TV · 60 min
│   poster   │  Sci-Fi & Fantasy · Drama
│            │  US · EN
└────────────┘
TMDB 7.5   IMDb 7.5   RT 78%              ← stat row, no chrome

[ Watching | WATCHED | Dropped ]           ← segmented
Watched 2× · Sep 25, 2026     Watched again  ← only when Watched

MY RATING
★★★★★★★★☆☆                     8 / 10    ← tap to set, saves instantly
┌──────────────────────────────────────────┐
│ Add a review…                            │ ← saves on blur
└──────────────────────────────────────────┘

Paul Atreides unites with Chani…          ← overview, 4 lines, "More"

CAST
Timothée Chalamet · Zendaya · Rebecca Ferguson · …

WHERE TO WATCH · US
( Netflix ) ( Apple TV · rent )

NOTES
Watch with subtitles                              ← long-press delete
┌──────────────────────────────────────────┐
│ Add a note…                          Add │
└──────────────────────────────────────────┘
```

```
not cached   ⟳ (centered) then renders
error        Couldn't load this title.   [ Try again ]
```

## Settings (tab 3, grouped inset list)

```
Settings
DATA SOURCES
╭────────────────────────────────────────────────╮
│ TMDB                           Connected ✓   › │
├────────────────────────────────────────────────┤
│ OMDb                           Not set       › │
╰────────────────────────────────────────────────╯
TMDB powers search and rankings. OMDb adds IMDb & RT ratings.

STREAMING
╭────────────────────────────────────────────────╮
│ Region                                  US   › │
├────────────────────────────────────────────────┤
│ Netflix                                    ─●  │
│ Apple TV+                                  ─●  │
│ Disney+                                    ○─  │
│ …                                              │
╰────────────────────────────────────────────────╯

BACKUP ⓘ
╭────────────────────────────────────────────────╮
│ iCloud Drive                               ─●  │
│ Files → iCloud Drive → What to Watch · 4m ago  │
├────────────────────────────────────────────────┤
│ Export a copy…                               › │
│ Import from file…                            › │
╰────────────────────────────────────────────────╯
```

iCloud row states unchanged from `platform-cloud-drive.md` (drive off /
not entitled / not ready replace the location line; fix line accent).

### API key (pushed)

```
‹ Settings              TMDB
╭────────────────────────────────────────────────╮
│ ••••••••••••••••••••••••••••            Show   │
╰────────────────────────────────────────────────╯
Get a free key at themoviedb.org → Settings → API.
Use the short "API Key", not the Read Access Token.
                  [[ Save ]]·                 ← disabled until changed
( Remove key )!                               ← only when saved
```

```
saving    ⟳ Checking key…
invalid   ⚠ TMDB rejected this key (401).     ← verified on save
saved     ← pops back; row shows Connected ✓
```

### Region (pushed)

```
‹ Settings             Region
United States                               ✓
United Kingdom
Canada
…
```

## Tokens

| Token | Light | Dark |
|---|---|---|
| background | #FFFFFF | #000000 |
| grouped bg | #F2F2F7 | #000000 |
| card | #FFFFFF | #1C1C1E |
| text | #000000 | #FFFFFF |
| secondary | #6C6C70 | #98989F |
| separator | #C6C6C8 | #38383A |
| accent | #0A84FF | #0A84FF |
| chip | #EFEFF4 | #2C2C2E |
| chip selected | text-colour bg, background-colour text | same |

Type: large title (system), section label 13/600 uppercase secondary,
body 17, meta 13. Spacing 4/8/12/16/24. Poster radius 10.

## Copy

| Key | String |
|---|---|
| discover.noKey | Connect TMDB to see what's streaming. |
| discover.noPlatforms | Pick your services in Settings. |
| discover.filtered | Nothing matches your filters. |
| search.placeholder | Movies, shows, cast |
| search.noKey | Connect TMDB to search everything. |
| title.watchedAgain | Watched again |
| settings.sources.footer | TMDB powers search and rankings. OMDb adds IMDb & RT ratings. |
| key.hint.tmdb | Get a free key at themoviedb.org → Settings → API. Use the short "API Key", not the Read Access Token. |
| key.invalid | {provider} rejected this key ({status}). |

## Deviations from the `uiux` skill

- Filters use a form sheet (a list filter, not a form field — allowed).
- Key screen is a pushed page, not an in-place panel: a secret needs its own
  focus and validation state.
