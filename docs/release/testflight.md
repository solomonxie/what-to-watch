# TestFlight external testing

App Store Connect → TestFlight → External Testing → **+** group → add the build. First build of a version goes through Beta App Review (~1 day).

## Test Information

Beta App Description (≤4000):

```
What to Watch tells you what's worth watching on the streaming services you already pay for. Pick your services (Netflix, Prime, Disney+, Apple TV+, Max, Hulu, Crave and more) and your region, and Discover shows popular titles and taste-based picks with where each one streams.

No account with us. Movie and TV data comes from TMDB and needs a free TMDB API key: Library tab → gear → Data sources → TMDB → paste → Save. For a filled-in library: Settings → Demo mode (its own database and key slot; backups, iCloud and Spotlight are off while it's on).

What's in this beta:
• Discover across 20 regions with filters (type, year, rating, age, genre, language, country, cast)
• Title page: ratings, where it streams, Watch on buttons, episode tick-off
• Library with watch marks, ratings and reviews sorted by verdict
• Search local library plus TMDB, in English or Chinese
• Import from IMDb, Letterboxd or any CSV
• Local and iCloud Drive backup; Spotlight indexing of cached titles
```

Feedback Email: `you@example.com`

## Contact Information

| Field | Value |
|---|---|
| First Name | TODO |
| Last Name | TODO |
| Phone number | TODO — yours, with country code (`+1 …`) |
| Email | `you@example.com` |

## Sign-In Information

Sign-in required: **off** (no account in the app). Leave User Name / Password blank.

Review Notes (Beta App Review Information):

```
No account or login. The app needs a TMDB API key for movie and TV data; please use this one: TODO_PASTE_KEY. Enter it under Library tab → gear → Data sources → TMDB → Save, then Discover fills in. For a filled-in library use Settings → Demo mode (same key slot). Not offered on the China mainland storefront because TMDB is unreachable there.
```

## Per build: What to Test

```
Get a free key at themoviedb.org and paste it under Library → gear → Data sources → TMDB. Pick your services and region, browse Discover with a few filters, open a title and tap Watch on. Mark something watched with a rating. Search a Chinese title. Import a Letterboxd CSV if you have one. Turn on Settings → Demo mode and off again. Report anything slow, wrong or confusing with a screenshot via TestFlight.
```
