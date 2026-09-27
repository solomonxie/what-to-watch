# App Store Release

Bundle ID from `ios/Local.xcconfig` · iOS 15.1+ · iPhone only, portrait.

- [`listing.md`](listing.md) — step-by-step plan and every App Store Connect field, ready to paste
- [`privacy-policy.md`](privacy-policy.md) — the policy; its GitHub URL is the Privacy Policy URL
- `screenshots/6.9`, `screenshots/6.5` — upload-ready, from `make screenshots SHOTS=<dir>`

Signing: `ios/Local.xcconfig` (gitignored) holds `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER`;
`ios/Signing.xcconfig` has placeholders only. This repo is public — keep account identifiers out of it.

Upload a build: `make release` — typecheck + tests, archive, sign, upload. Nothing in Xcode.
Build number is a timestamp unless you pass `BUILD=`. `make help` lists the rest.

Versioning: `MARKETING_VERSION` in `project.pbxproj` is the user-visible version; bump it per
release. `CURRENT_PROJECT_VERSION` is set per upload by the script and never committed.
