.PHONY: help check ios release screenshots

# App Store region baked into the build: us (Canada/US) or cn.
STORE ?= us

.DEFAULT_GOAL := help

help:
	@echo "make ios          Release build onto the paired iPhone"
	@echo "make release      check, then archive + upload to App Store Connect"
	@echo "make release BUILD=202609261830   same, with the build number pinned"
	@echo "make check        typecheck + tests"
	@echo "make screenshots  SHOTS=<dir>  resize to the App Store slots"
	@echo "STORE=cn          on ios/release: build for the China App Store (default us)"

check:
	npm run check

# Personal install: .env.demo keys (if any) go in for demo mode.
ios:
	scripts/install-config.sh $(STORE) demo-keys
	npx react-native run-ios --mode Release --device

# Archive, sign for the App Store and upload, all of it — no Xcode Organizer.
# Needs ios/Local.xcconfig (Team ID, bundle id) and the app record already
# created in App Store Connect. Uploads whatever is on disk, so say so when
# that is not a commit.
release: check
	@git diff --quiet HEAD -- || echo "warning: uncommitted changes are going into this build"
	scripts/install-config.sh $(STORE)
	scripts/release-ios.sh $(BUILD)

screenshots:
	scripts/store-screenshots.sh $(SHOTS)

