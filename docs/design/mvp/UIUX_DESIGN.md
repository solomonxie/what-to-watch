# What to Watch — UI/UX

Product reasoning: `DESIGN.md`. Glyphs: `uiux` skill `notation.md`. Width 60.

Principles: content first (posters, not forms) · one job per screen · system
components (native tabs, header search, form sheets, grouped lists) · light +
dark from one token set · no instructions on screen that a control can imply.

## Screen map

```
       ┌────────────── native tab bar ──────────────┐
       │   Discover         Library         Settings │
       └─────┬───────────────┬────────────────┬─────┘
  search ◀───┤ (floating)    │                ├──▶ API key (push)
  Filters ◀──┤               │                ├──▶ Region (push)
             ▼               ▼                └──▶ Taste (push) ──▶ Add <facet>
           Title ◀───────────┘                (Title pushes inside the tab it came from)
```

## Taste (pushed from Settings)

```
‹ Settings                Taste
[ BOTH | Movies | Shows ]
Only on my services                               ─●
GENRES                                     drag to rank
╭────────────────────────────────────────────────╮
│ 1  Science Fiction                        ✕  ≡ │ ← hold ≡ and drag
│ 2  Thriller                               ✕  ≡ │
│ 3  Drama                                  ✕  ≡ │
├────────────────────────────────────────────────┤
│ Add genre…                                   › │
╰────────────────────────────────────────────────╯
TOPICS         (same list)     Add topic…    › ← search TMDB keywords
LANGUAGES      (same list)     Add language… ›
COUNTRIES      (same list)     Add country…  ›
```

Drag: hold ≡ ▲▼ ⇒ row lifts (shadow), others slide; release ⇒ saved.
Higher = stronger weight.

### Add <facet> (pushed)

```
‹ Taste              Add genre
│ 🔍 Filter                                     │   ← topics: searches TMDB
Action                                          +
Animation                                       +
Comedy                                          ✓   ← already added, tap removes
…
```

## Discover (tab 1, home)

No taste set → what's popular. Any taste set (Settings → Taste) → picks for you.

```
Discover                                    Filters·2
[[ All ]] ( Netflix ) ( Apple TV+ ) ( Max ) →        ← All = every enabled service
PICKED FOR YOU                      Updated 12 min ago   ← or "Updating…"
┌──────────┐ ┌──────────┐ ┌──────────┐
│  poster  │ │  poster  │ │  poster  │
└──────────┘ └──────────┘ └──────────┘
Past Lives   Parasite     Arrival
Romance·KO   Thriller·KO  Sci-Fi       ← reasons
```

```
MOST POPULAR · US                                   ← no taste
┌──────────┐ ┌──────────┐
│1         │ │2         │               ← rank badge on a single service;
└──────────┘ └──────────┘                 All interleaves services, no badge
Wednesday    3 Body Pro…
★ 8.4 · TV   ★ 7.5 · TV
```

Picks: cached result renders at once; refreshes in the background when > 6 h
old or taste / services / region changed; pull to refresh forces. Filters apply
on top of either mode.

States (grid area):

```
no key     Connect TMDB to see what's streaming.   [[ Connect ]] → Settings/TMDB
loading    ⟳ (centered)
error      Couldn't load Netflix.                   [ Try again ]
filtered   Nothing matches your filters.            [ Clear filters ]
no plats   Pick your services in Settings.          [ Choose ]
no picks   Nothing matched your taste here. Try more genres in Settings → Taste.  [ Edit taste ]
update err "Couldn't update · showing saved picks"   ← grid stays
```

### Search (floating pill → full-screen search)

On every tab, floating above the tab bar (hidden while the keyboard is up):

```
┌──────────────────────────────────────────────┐
│  poster grid …                               │
╭──────────────────────────────────────────────╮
│ ⌕  Search movies, shows, cast                │ ← pill, shadow, 46pt
╰──────────────────────────────────────────────╯
 Discover     Library     Settings              ← native tab bar
```

tap ↓ ⇒ full-screen search (fade), field at the bottom above the keyboard,
results fill upward; titles open inside the search stack. iOS 26's detached
search tab would be the native form, but the target phone runs iOS 18.

```
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

### Filters (card modal)

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
[ TO WATCH | Watching | Watched | Rated ]      ← opens on To watch
┌──────────┐ ┌──────────┐ ┌──────────┐
│        2×│ │          │ │       ★9 │  ← badge: times / my rating
└──────────┘ └──────────┘ └──────────┘
Dune: Par…   Severance    Past Lives
```

```
empty to watch  Save titles to watch later from any title page.
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

WATCH ON                                    ← "MORE ON" when not streaming
┌────┐ ┌────┐ ┌────┐ ┌────┐
│logo│ │logo│ │IMDb│ │TMDB│                ← streaming logos only for
└────┘ └────┘ └────┘ └────┘                  services it streams on (flatrate/free)
Netflix Max    IMDb   TMDB
tap ⇒ platform search for the title (universal link → app), IMDb / TMDB page

[ To watch | Watching | WATCHED | Dropped ]  ← segmented
Watched 2× · Sep 25, 2026     Watched again  ← only when Watched

MY RATING
★★★★★★★★☆☆                     8 / 10    ← tap to set, saves instantly
┌──────────────────────────────────────────┐
│ Add a review…                            │ ← saves on blur
└──────────────────────────────────────────┘

Paul Atreides unites with Chani…          ← overview, 4 lines, "More"

CAST
Timothée Chalamet · Zendaya · Rebecca Ferguson · …

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

### Import (pushed from Library header "Import")

```
‹ Library               Import
FROM A FILE
╭────────────────────────────────────────────────╮
│ Choose CSV…                                  › │
╰────────────────────────────────────────────────╯
Douban movie exports, IMDb ratings or watchlist, Letterboxd …
FROM A LINK
╭────────────────────────────────────────────────╮
│ letterboxd.com/you or douban.com/people/you  Import │
╰────────────────────────────────────────────────╯
Reads the public feed: Letterboxd recent diary, Douban latest ~10 marks.
```

```
reading   Reading…
matching  Matching Douban titles · 45 / 120   [████░░░░]
done      IMPORTED FROM DOUBAN  Added 110 of 120 · Watched 72 · To watch 38 · Ratings 60
          NOT FOUND (10)  <title> <year> …
error     ⚠ This is a book export (227 books). What to Watch imports movies and shows —
            export your Douban movie (影视) list instead.
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

TASTE
╭────────────────────────────────────────────────╮
│ Taste                   Sci-Fi, Thriller, …  › │
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

- Filters use a card modal (a list filter, not a form field — allowed). Detented form sheet dropped: it laid out wrongly on device.
- Key screen is a pushed page, not an in-place panel: a secret needs its own
  focus and validation state.
