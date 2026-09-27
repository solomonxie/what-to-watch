# Publishing What to Watch — step by step

Every field below is ready to paste. `TODO` = only you can supply it.
App Store Connect paths start at **Apps → What to Watch → Distribution →**.

| | |
|---|---|
| Bundle ID | `PRODUCT_BUNDLE_IDENTIFIER` in `ios/Local.xcconfig` |
| SKU | `whattowatch-ios` |
| Version | `1.0` (`MARKETING_VERSION`) |
| Build | timestamp, set by `make release` |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`) — no iPad screenshots needed |
| Min iOS | 15.1 |
| Privacy Policy URL | `https://github.com/solomonxie/what-to-watch/blob/master/docs/release/privacy-policy.md` |
| Support URL | `https://github.com/solomonxie/what-to-watch/issues` |

---

## 1. Apple Developer account

- [ ] developer.apple.com → Account → membership **active** (paid, Individual is fine).
- [ ] App Store Connect → **Business** (Agreements, Tax, and Banking) → no pending agreement banner. Free app: no Paid Apps agreement or banking needed.

## 2. Xcode

- [ ] Xcode → Settings → **Accounts** → signed in with the developer Apple ID; the team shows under it.
- [ ] `ios/Local.xcconfig` has `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER`. Gitignored — never commit it; the repo is public.
- [ ] `cd ios && pod install` succeeds. The base-configuration warning is expected — `ios/Debug.xcconfig` / `ios/Release.xcconfig` `#include` the Pods one, then `Signing.xcconfig` → `Local.xcconfig`. Leave it.

## 3–4. Bundle ID and iCloud container

Created by automatic signing on the first device build. Verify at
developer.apple.com → Certificates, Identifiers & Profiles:

- [ ] Identifiers → your bundle ID → **iCloud** checked (iCloud Documents), container `iCloud.<bundle id>` assigned.
- [ ] `ios/ExportOptions.plist` sets `iCloudContainerEnvironment = Production` at export — the entitlements file pins no environment.

## 5. Run on the iPhone

- [ ] `make ios` → Release build on the paired iPhone. Smoke-test: add a TMDB key, Discover loads, a filter, open a title, mark episodes, rate one, Library sections, IMDb CSV import, iCloud backup on.

## 6. Create the app in App Store Connect

**Apps → + → New App**

| Field | Value |
|---|---|
| Platforms | iOS |
| Name | `What to Watch: Stream Picker` |
| Primary Language | English (U.S.) |
| Bundle ID | yours (dropdown) |
| SKU | `whattowatch-ios` |
| User Access | Full Access |

"What to Watch" alone is almost certainly taken. Runner-ups in [App Store Connect pages](#app-store-connect-pages).

## 7. Listing content

Fill the pages in [App Store Connect pages](#app-store-connect-pages) below. Screenshots: see [Screenshots](#screenshots).

## 8–9. Archive and upload

```
make release
```

Runs `npm run check` (typecheck + tests), then archives Release, signs for the App Store
and uploads. `make release BUILD=202609261830` pins the build number; left off it is a
timestamp. (`npm run release:ios` is the same script without the checks.)

Upload authenticates as the Apple ID signed into Xcode → Settings → Accounts. If it asks
for credentials in a terminal, add an App Store Connect API key instead: download the
`.p8`, then append `-authenticationKeyPath <abs path> -authenticationKeyID <id>
-authenticationKeyIssuerID <issuer>` to the `-exportArchive` call in `scripts/release-ios.sh`.
Processing: 15–60 min, then an email "build has completed processing".

Fallback, Xcode GUI: open `ios/WhatToWatch.xcworkspace` → destination **Any iOS Device (arm64)** → Product → **Archive** → Organizer → **Distribute App** → App Store Connect → Upload.

## 10. TestFlight

- [ ] **TestFlight** → the build shows no "Missing Compliance" (see [Export compliance](#export-compliance)).
- [ ] Internal Testing → **+** group `Me` → add your Apple ID → install via the TestFlight app.
- [ ] Same smoke test as step 5 on the TestFlight build (the exact binary Apple reviews). Check iCloud specifically — it is the Production container now: switch on, confirm **Files → iCloud Drive → What to Watch** appears, delete and reinstall, see the library come back.

## 11. Submit

- [ ] `iOS App → 1.0 Prepare for Submission` → **Build** → **+** → pick the build.
- [ ] Every page in [App Store Connect pages](#app-store-connect-pages) filled; App Privacy published.
- [ ] **Add for Review** → **Submit for Review**.

## 12. App Review

- Typical: 24–48 h. Waiting for Review → In Review → Pending Developer Release.
- Rejection → **Resolution Center**: reply there, or fix and re-run `make release`, attach the new build, resubmit. No `MARKETING_VERSION` bump for a rejected version.
- Most likely question: the TMDB key. The review notes hand one over — without it the reviewer sees an empty Discover and rejects under 2.1 (incomplete app).

## 13. Release

- [ ] **Pending Developer Release** → `1.0` page → **Release This Version**. Live within ~24 h.
- [ ] `git tag v1.0 && git push --tags`.

---

## Screenshots

Apple requires one set: **iPhone 6.9" Display**, exactly `1320 × 2868`. App Store Connect
scales it for smaller phones. The 6.5" slot (`1284 × 2778`) is optional and generated anyway.

Capture on the paired iPhone 14 (`1170 × 2532`) — the 0.4% aspect difference is invisible.

1. `make ios` — Release build, no dev overlay. Rate a dozen well-known titles first so Library isn't empty; nothing personal in the reviews or notes.
2. Status bar: charged battery, Wi-Fi, no banners; leave the phone alone while it captures.
3. Shots, in upload order (3 min, 10 max — the first two are what people see):
   1. **Discover** — `discover`
   2. **Title** — `title/movie%3A803796` (KPop Demon Hunters: Netflix row, four ratings)
   3. **Library** — `library`
   4. **Filters** — `filters`
   5. **Search** — `search?q=terminator`
   6. **Taste** — `taste`
   7. **Settings** — `settings`

   Each is a deep link: `scripts/screenshot.sh <link> <out.png> [wait]` opens it on the paired, unlocked iPhone and captures it — no taps.
4. Save them as `01-discover.png`, `02-title.png` … in one folder, then:

```
make screenshots SHOTS=~/Desktop/shots
```

Outputs go to `docs/release/screenshots/{6.9,6.5}/`, alpha stripped. Drag the `6.9` files into the 6.9" slot.

App Preview video: skip for 1.0.

---

## App Store Connect pages

### `iOS App → 1.0 Prepare for Submission`

| Field | Value |
|---|---|
| Previews and Screenshots | [Screenshots](#screenshots) |
| Promotional Text | below |
| Description | below |
| Keywords | below |
| Support URL | `https://github.com/solomonxie/what-to-watch/issues` |
| Marketing URL | leave blank |
| Version | `1.0` |
| Copyright | `2026 solomonxie` |
| Routing App Coverage File | leave blank |
| Build | the uploaded build (step 11) |
| App Review → Sign-In Required | Off |
| App Review → Contact First / Last Name | TODO |
| App Review → Phone | TODO (with country code, e.g. `+1 …`) |
| App Review → Email | TODO |
| App Review → Notes | below — paste your TMDB key where marked |
| App Review → Attachment | none |
| Version Release | **Manually release this version** |

Promotional Text (≤170):

```
Stop scrolling five apps to pick one show. See what's popular on the services you pay for, filtered your way, next to everything you've watched and rated.
```

Description:

```
What to Watch answers one question: what's on tonight, on the services you already pay for?

No account. No subscription. No ads. Your ratings and history stay on your iPhone.

DISCOVER ON YOUR SERVICES
• Netflix, Prime Video, Disney+, Apple TV+, Max and Hulu — and Crave in Canada
• Popular titles per service, in your own region — 20 countries supported
• Set your taste — genres, languages, countries, topics — and get picks with the reason for each
• "Only on my services" keeps everything to what you can actually play

FILTER IT DOWN
• Movies, series, documentaries, docuseries, reality & talk
• Release year, rating 6+ / 7+ / 8+, age rating from Kids to Adults
• Genre, language, country and cast
• Sort by popularity, rating, year or A–Z

EVERYTHING ABOUT A TITLE
• Poster, overview, cast and where it streams
• TMDB rating, plus IMDb and Rotten Tomatoes with an optional OMDb key
• One tap opens it in the streaming app
• Seasons and episodes, ticked off as you watch

YOUR LIBRARY, SORTED BY VERDICT
• Continue watching, My next watch, My top rated, I feel so-so, Waste of time, To be rated
• Half-star ratings, your own review, private notes
• Watch status follows what you do: rate a film and it's watched, tick an episode and the show is in progress

BRING YOUR HISTORY
• Import your IMDb ratings or watchlist export as-is
• Or any CSV with a title column — year, IMDb or TMDB id, rating, review and date are picked up when present

SEARCH
• Fuzzy search across your library and everything cached, as you type
• Plus TMDB's full catalog online

BACKUP
• Local snapshots on every change, visible in the Files app
• A daily backup to your own iCloud Drive; a fresh install restores it automatically
• Export or import a plain file whenever you like

Needs a free TMDB API key — two minutes at themoviedb.org, and the app links you there. Free, with no ads and no analytics.

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability by JustWatch.
```

Keywords (≤100, no spaces — name words and brand names left out; Apple rejects other companies' trademarks in keywords):

```
movie,film,tv,series,show,streaming,watchlist,tracker,episode,rating,review,recommend,cinema,guide
```

App Review Notes:

```
No account or login is needed. The app gets movie and TV data from TMDB (The Movie Database) using the user's own free API key, entered in Settings → Data sources → TMDB. Please use this key for review:

TMDB API key: TODO_PASTE_KEY

Once saved, the Discover tab fills with popular titles on the enabled streaming services (Netflix and Apple TV+ by default; more under Settings → Streaming).

Optional features a reviewer may skip:
- OMDb key (Settings → Data sources → OMDb): adds IMDb and Rotten Tomatoes ratings. The app works fully without it.
- iCloud backup (Settings): uses the user's own iCloud Drive; the app works with local storage only.
- CSV import (Settings): imports the user's own IMDb export or a CSV of titles.

"Watch on" buttons open the title in the streaming service's own app or website; the app plays nothing itself and makes no claim of affiliation with those services. All data is stored on the device in a local SQLite database. We operate no server and receive no user data.
```

What's New: not shown for a first version. From 1.1 on, write it here.

### `General → App Information`

| Field | Value |
|---|---|
| Name | `What to Watch: Stream Picker` (28/30) |
| Subtitle | `Movies & shows on your apps` (27/30) |
| Category — Primary | Entertainment |
| Category — Secondary | Lifestyle |
| Content Rights | **Yes**, it contains, shows, or accesses third-party content — you have the rights: TMDB metadata and images under TMDB's API terms, with the required attribution in Settings and the description |
| Age Rating | **Edit** → answers below → result **13+** |
| License Agreement | Apple standard EULA (default) |
| Privacy Policy URL | `https://github.com/solomonxie/what-to-watch/blob/master/docs/release/privacy-policy.md` |

If the name is taken, in order: `What to Watch — Stream Finder` (29), `WhatToWatch: Movie & TV Picker` (30), `What to Watch Tonight` (21).

Age rating questionnaire — every answer:

| Section | Answer |
|---|---|
| Parental controls / age assurance | No |
| Unrestricted web access | No — no in-app browser; links open Safari or the streaming app |
| User-generated content | No — your reviews are private. Public TMDB reviews are shown read-only, not posted from the app |
| Messaging and chat | No |
| Advertising | No |
| Mature or suggestive themes | **Infrequent/Mild** — posters and synopses of real films and shows |
| Violence (cartoon, realistic), horror/fear | **Infrequent/Mild** — same reason |
| Profanity or crude humor | **Infrequent/Mild** — public reviews |
| Sexual content or nudity | None — TMDB adult titles are excluded |
| Alcohol, tobacco, drugs | Infrequent/Mild |
| Medical or treatment information / health & wellness | None |
| Gambling, simulated gambling, contests, loot boxes | None / No |
| Made for Kids | No |

Regional (Korea, China Mainland, Vietnam) — leave unset.
**Digital Services Act** trader status: **Not a trader** (free, no monetization).

### `App Store → Trust & Safety → App Privacy`

| Field | Value |
|---|---|
| Privacy Policy URL | same as above |
| Do you or your third-party partners collect data from this app? | **No, we do not collect data from this app** |

Then **Publish**. The label shows "Data Not Collected".

True only while there is no analytics or crash SDK — re-check before each submission:

```
grep -rniE "analytics|firebase|sentry|amplitude|mixpanel|posthog|bugsnag" package.json ios/Podfile.lock
```

Data leaves the device only to TMDB and OMDb under the user's own keys, and to their own iCloud Drive. Each is a live request answered in real time; none is an SDK, and you never receive any of it, so none of it is "collected" in Apple's sense.

### `App Store → Trust & Safety → App Accessibility`

Skip for 1.0 rather than over-claim.

### `App Store → Monetization → Pricing and Availability`

| Field | Value |
|---|---|
| Base Country or Region | United States (USD) |
| Price | **Free** ($0.00) |
| Availability | All countries or regions |
| Tax Category | App Store software (default) |
| iPhone and iPad Apps on Apple Silicon Macs | **Off** for 1.0 (iCloud Files paths and the document picker are untested on Mac) |
| Apple Vision Pro | Off |

### Not needed for 1.0

In-App Purchases, Subscriptions, In-App Events, Custom Product Pages, Product Page Optimization, Promo Codes, Game Center, Featuring Nominations, Ratings and Reviews, History, localizations (the UI is English only).

---

## Export compliance

No page for it in App Store Connect. `ITSAppUsesNonExemptEncryption = false` in `Info.plist`
answers it at upload (HTTPS/TLS and Keychain only — exempt).
Verify: TestFlight → the build is **not** marked "Missing Compliance".
Only if it is: **Manage** → **None of the algorithms mentioned above**.
