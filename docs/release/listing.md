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
- [ ] `cp ios/Local.xcconfig.example ios/Local.xcconfig`, then set `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER`. Gitignored — never commit it; the repo is public.
- [ ] `cd ios && pod install` succeeds. The base-configuration warning is expected — `ios/Debug.xcconfig` / `ios/Release.xcconfig` `#include` the Pods one, then `Signing.xcconfig` → `Local.xcconfig`. Leave it.

## 3–4. Bundle ID and iCloud container

Created by automatic signing on the first device build. Verify at
developer.apple.com → Certificates, Identifiers & Profiles:

- [ ] Identifiers → your bundle ID → **iCloud** checked (iCloud Documents), container `iCloud.<bundle id>` assigned.
- [ ] `ios/ExportOptions.plist` sets `iCloudContainerEnvironment = Production` at export — the entitlements file pins no environment.

## 5. Run on the iPhone

- [ ] `make ios` → Release build on the paired iPhone. Smoke-test: Library → gear → TMDB key, Discover loads, a filter, Search tab (English and Chinese title), open a title, tick episodes, add a watch mark with a rating, Library sections and genres, IMDb and Letterboxd CSV import, iCloud backup on, Demo mode on/off, a title found in iOS Spotlight.

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

### The reviewer's TMDB key

The App Store build has **no TMDB key built in** — `make release` writes empty demo keys; only `make ios` bakes in `.env.demo`. So the review notes must carry one:

- [ ] themoviedb.org → Settings → API → copy the **API Key** (v3, 32 hex chars) — not the Read Access Token. Your own key is fine; a second free TMDB account just for review is cleaner.
- [ ] Paste it over `TODO_PASTE_KEY` in the notes **in App Store Connect only**. Never commit it here — the repo is public.
- [ ] Keep that key valid until the app is live; a revoked key = empty Discover = rejection.
- OMDb key: not needed for review.

### Guideline 2.1 "Information Needed" (new developer accounts)

Apple wants a screen recording plus answers 2–6. The answers are the App Review Notes below — paste them into the reply **and** into App Review → Notes.

Recording (the build Apple reviews, from TestFlight, on the iPhone):
1. iPhone Settings → Control Center → add **Screen Recording**. Do Not Disturb on.
2. Delete and reinstall from TestFlight so it starts empty (no key). Swipe the app away.
3. Start recording, launch from the Home Screen.
4. ~2 minutes: Discover "needs a TMDB key" state → Library → gear → TMDB → paste key → Save → Discover fills → Filters (Type, Rating, Genre) → open a title (ratings, Watch on, tap Netflix/Apple TV to show it opens their app or site) → + Add watch mark, rate, Save → Search tab, type a title → Library sections → gear → Demo mode on → Library filled → Demo mode off.
5. Stop. Photos → trim → share.

Reply: App Store Connect → the message → **Reply**, attach the video (or an unlisted link if too large), paste:

```
Hello, thank you for the review. Answers below, and the same text is now in the App Review Information notes.

1. Screen recording attached, captured on an iPhone running the latest iOS, starting from launch. The app has no account registration or login (so no account deletion flow), no user-generated content shared with others, and no paid content.

[paste the App Review Notes block from PURPOSE AND AUDIENCE to the end]
```

## 13. Release

- [ ] **Pending Developer Release** → `1.0` page → **Release This Version**. Live within ~24 h.
- [ ] `git tag v1.0 && git push --tags`.

---

## Screenshots

Apple requires one set: **iPhone 6.9" Display**, exactly `1320 × 2868`. App Store Connect
scales it for smaller phones.

**Ready (2026-10-02).** Upload the `6.9` files in filename order (`01-discover.jpg` first).

| # | Shot | Deep link |
|---|---|---|
| 1 | **Discover** — picks on your services | `discover` |
| 2 | **Title** — Dune: Part Two, watched and rated (demo library) | `title/movie%3A693134` |
| 3 | **Library** — Continue watching, My next watch, My top rated | `library` |
| 4 | **Filters** | `filters` |
| 5 | **Search** — results, no keyboard (a linked `q` skips auto-focus) | `search?q=terminator` |
| 6 | **Taste** | `taste` |
| 7 | **Settings** — data sources, streaming | `settings` |

All in Demo mode, light appearance, status bar 9:41 / Wi-Fi / full battery, no "◀ App" breadcrumb (Apple rejects screenshots that don't match the app, 2.3.3).

Recapture — simulator (this set: iPhone 18 Pro, `1206 × 2622`):

1. Release build for the simulator with the demo keys in `ios/Install.xcconfig` and `SWIFT_ACTIVE_COMPILATION_CONDITIONS='$(inherited) SCREENSHOTS'` — enables the `-openURL <link>` launch argument (never in `make ios`/`make release` builds). Don't use `simctl openurl`: iOS shows an "Open in…" alert that sticks.
2. `xcrun simctl status_bar <udid> override --time 9:41 --dataNetwork wifi --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100`
3. Per shot: `xcrun simctl launch --terminate-running-process <udid> <bundle id> -demoMode 1 -openURL whattowatch://<link>`, wait ~8 s, `xcrun simctl io <udid> screenshot 0N-name.png`.

Recapture — paired iPhone: `make ios`, then `DEMO=1 scripts/screenshot.sh <link> <out.png> [wait]` per shot (Demo mode needs a TMDB key in `.env.demo` or set in the app).

Then, with `01-discover.png` … in one folder:

```
make screenshots SHOTS=~/Desktop/shots
```

Outputs go to `docs/release/screenshots/`, resized, alpha stripped.

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
• Movies, series, documentaries, docuseries, reality & talk, animation, anime
• Release year, rating 6+ / 7+ / 8+, age group from Kids to Adults, content rating
• Genre, language, country and cast
• Sort by popularity, rating, year or A–Z
• Recent filters, one tap to reuse

EVERYTHING ABOUT A TITLE
• Poster, overview, cast and where it streams
• TMDB rating, plus IMDb and Rotten Tomatoes with an optional OMDb key
• One tap opens it in the streaming app
• Links to IMDb, TMDB, Douban and YouTube
• Seasons and episodes, ticked off as you watch

YOUR LIBRARY, SORTED BY VERDICT
• Continue watching, My next watch, My top rated, I feel so-so, Waste of time, To be rated
• Browse by genre and language
• Watch marks: a status, a date, a half-star rating and your review — for a whole title, a season or one episode, and again for every rewatch
• Watch status follows what you do: rate a film and it's watched, tick an episode and the show is in progress

BRING YOUR HISTORY
• Import your IMDb or Letterboxd ratings and watchlist exports as-is
• Or any CSV with a title column — year, IMDb or TMDB id, rating, review and date are picked up when present

SEARCH
• Its own tab: search your library and everything cached as you type, plus TMDB's full catalog
• Find titles by their Chinese name too
• Every cached title shows up in iPhone Spotlight search

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

App Review Notes (also the Guideline 2.1 answers). Paste your TMDB key over `TODO_PASTE_KEY` in App Store Connect only — see [The reviewer's TMDB key](#the-reviewers-tmdb-key):

```
No account or login. The app gets movie and TV data from TMDB (The Movie Database) with the user's own free API key. Please use this key for review:

TMDB API key: TODO_PASTE_KEY

Enter it in: Library tab → gear icon (top right) → Data sources → TMDB → paste → Save. (Discover also shows a button to that screen while no key is set.) Discover then fills with popular titles on the enabled streaming services (Netflix and Apple TV+ by default; more under the same Settings → Streaming).

For a filled Library: Settings → Demo mode on. It loads a sample library in its own database and uses the same key; switching it off returns to the real data untouched.

PURPOSE AND AUDIENCE
What to Watch is for people who subscribe to a few streaming services and want to decide what to watch tonight. It shows what is popular or matches their taste on the services they have, in their region, next to what they have already watched and rated. It replaces scrolling through several streaming apps and keeping a separate watch log.

HOW TO USE THE MAIN FEATURES
- Discover tab: popular titles and picks per service; chips switch service; Filters (type, year, rating, age, content rating, genre, language, country, cast, sort).
- Search tab (middle): searches the local library and TMDB as you type, in English or Chinese.
- Title page: ratings, where it streams, "Watch on" buttons, cast, TMDB reviews, seasons and episodes to tick, Watch marks (+ Add: status, date, rating, review).
- Library tab: Continue watching, My next watch, My top rated, I feel so-so, Waste of time, To be rated, by genre and language. Gear icon: Settings.
- Settings: API keys, region, streaming services, taste, CSV import, backup and export, Demo mode.

OPTIONAL FEATURES (the app is fully usable without them)
- OMDb key (Settings → Data sources → OMDb): adds IMDb and Rotten Tomatoes ratings.
- iCloud backup: the user's own iCloud Drive.
- CSV import: the user's own IMDb or Letterboxd export, or a CSV of titles.

EXTERNAL SERVICES
- TMDB (api.themoviedb.org, image.tmdb.org): titles, details, images, reviews, streaming availability (JustWatch data via TMDB), with the user's key.
- OMDb (omdbapi.com): only if the user adds their own key.
- Apple iCloud Drive (if on) and iOS Spotlight (on-device index of cached titles).
- Links open Netflix, Prime Video, Disney+, Apple TV, Max, Hulu, Crave, Paramount+, Peacock, IMDb, TMDB, Douban or YouTube in their app or Safari, only when tapped (Douban: its search page for the title). The app makes no requests to these sites itself, plays no video and claims no affiliation with them.
No analytics, advertising, crash reporting, authentication or payment services. We run no server and receive no user data.

REGIONAL DIFFERENCES
Same app everywhere. The user picks one of 20 regions; streaming availability follows that region. Crave is offered only in Canada. The UI is English or Simplified Chinese (Settings → Language; follows the device language by default).

REGULATION
A personal watch log and discovery tool. No video, no purchases, no user accounts, no content shared between users. Metadata and images come from TMDB under its API terms, with the TMDB logo and notice in Settings and the notice in the description.
```

What's New: not shown for a first version. From 1.1 on, write it here.

### `General → App Information`

| Field | Value |
|---|---|
| Name | `What to Watch: Find your shows` (28/30) |
| Subtitle | `Movies & shows on your apps` (27/30) |
| Category — Primary | Entertainment |
| Category — Secondary | Lifestyle |
| Content Rights | **Yes**, it contains, shows, or accesses third-party content — you have the rights: TMDB metadata and images under TMDB's API terms (free, non-commercial use) |
| Age Rating | **Edit** → answers below → result **13+** |
| License Agreement | Apple standard EULA (default) |
| Privacy Policy URL | `https://github.com/solomonxie/what-to-watch/blob/master/docs/release/privacy-policy.md` |

TMDB attribution — required by its API terms, check before submitting:
- [x] Notice "This product uses the TMDB API but is not endorsed or certified by TMDB." — Settings → Data sources, under the TMDB logo, and the description.
- [x] "Streaming availability by JustWatch." — same places (TMDB's watch-provider data requires it).
- [x] TMDB logo — the official "primary short" (blue_short) logo from themoviedb.org/about/logos-attribution, unaltered, rendered to `src/assets/tmdb-logo@2x/@3x.png`, 108×14 pt above the notice in Settings → Data sources; smaller than the app's own branding.

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

Data leaves the device only to TMDB and OMDb under the user's own keys, and to their own iCloud Drive. Links (streaming services, IMDb, Douban, YouTube) open in their app or Safari only when tapped; the app itself never requests those sites. Spotlight indexing stays on the device. Each is a live request answered in real time; none is an SDK, and you never receive any of it, so none of it is "collected" in Apple's sense.

### `App Store → Trust & Safety → App Accessibility`

Skip for 1.0 rather than over-claim.

### `App Store → Monetization → Pricing and Availability`

| Field | Value |
|---|---|
| Base Country or Region | United States (USD) |
| Price | **Free** ($0.00) |
| Availability | All countries or regions **except China mainland** — TMDB, IMDb and YouTube are unreachable there, so Discover stays empty, and China mainland needs an ICP filing number. `STORE=cn` builds exist but change nothing in the app yet (`storeRegion()` has no callers), so leave China mainland unchecked |
| Tax Category | App Store software (default) |
| iPhone and iPad Apps on Apple Silicon Macs | **Off** for 1.0 (iCloud Files paths and the document picker are untested on Mac) |
| Apple Vision Pro | Off |

### Not needed for 1.0

In-App Purchases, Subscriptions, In-App Events, Custom Product Pages, Product Page Optimization, Promo Codes, Game Center, Featuring Nominations, Ratings and Reviews, History. The 简体中文 localization is optional — see [below](#optional-简体中文-localization).

## Optional: 简体中文 localization

The app ships Chinese (Settings → Language; `CFBundleLocalizations` lists `zh-Hans` so the store shows it).
App Store Connect → App Information → language dropdown (top right) → **Add Chinese (Simplified)**,
then on the `1.0` page switch to it.

| Field | Value |
|---|---|
| Name | `What to Watch：流媒体选片` |
| Subtitle | `你订阅的平台，今晚看什么` |
| Privacy Policy URL | same |
| Keywords | `电影,电视剧,剧集,影视,流媒体,片单,追剧,评分,影评,推荐,观影,记录,选片,综艺,动漫` |
| Screenshots | reuse English ones, or upload the 中文 set if you capture one |

Promotional Text:

```
不用在五个应用里来回翻找。看看你订阅的平台上什么正热，按你的口味筛选，旁边就是你看过、评过分的所有片子。
```

Description:

```
What to Watch 只回答一个问题：今晚看什么，就看你已经订阅的平台。

无需账号，无广告。你的评分和观影记录只保存在你的 iPhone 上。

在你的平台上发现好片
• Netflix、Prime Video、Disney+、Apple TV+、Max、Hulu，加拿大还有 Crave
• 按你所在地区显示各平台的热门影视——支持 20 个国家和地区
• 设定你的口味：类型、语言、国家、主题，推荐时会说明理由
• “只看我的平台”，只显示你真正能播放的内容

层层筛选
• 电影、剧集、纪录片、纪录剧集、真人秀与脱口秀、动画、动漫
• 上映年份、评分 6+ / 7+ / 8+、从儿童到成人的年龄段、内容分级
• 类型、语言、国家和演员
• 按热度、评分、年份或 A–Z 排序
• 最近用过的筛选，一键复用

关于一部片的一切
• 海报、简介、演员，以及在哪里播放
• TMDB 评分；添加自己的 OMDb 密钥后，还可看到 IMDb 与烂番茄评分
• 一键在对应的流媒体应用中打开
• 链接到 IMDb、TMDB、豆瓣和 YouTube
• 季与集，边看边勾选

按“观后感”整理你的片库
• 继续观看、下一部要看、我的高分、感觉一般、浪费时间、待评分
• 按类型和语言浏览
• 观看记录：状态、日期、半星评分和你的短评——可针对整部、某一季或某一集，每次重看也能再记一笔
• 状态随你的操作自动更新：给电影评分即为已看，勾选一集即为在看

导入你的历史
• 直接导入 IMDb 或 Letterboxd 导出的评分和片单
• 或任何带“片名”列的 CSV——若有年份、IMDb 或 TMDB 编号、评分、短评和日期，也会一并读取

搜索
• 独立的搜索页：输入时即搜你的片库和已缓存的内容，也搜 TMDB 全库
• 中文片名同样能搜到
• 所有已缓存的片子都能在 iPhone 聚焦搜索中找到

备份
• 每次改动都在本机保存快照，可在“文件”App 中查看
• 每天备份到你自己的 iCloud 云盘；重装后自动恢复
• 随时导出或导入普通文件

需要一个 TMDB API 密钥——在 themoviedb.org 免费申请，两分钟即可，应用里有直达链接。无广告，无统计分析。

本产品使用 TMDB API，但未获 TMDB 认可或认证。流媒体可用性数据来自 JustWatch。
```

---

## Export compliance

No page for it in App Store Connect. `ITSAppUsesNonExemptEncryption = false` in `Info.plist`
answers it at upload (HTTPS/TLS and Keychain only — exempt).
Verify: TestFlight → the build is **not** marked "Missing Compliance".
Only if it is: **Manage** → **None of the algorithms mentioned above**.
