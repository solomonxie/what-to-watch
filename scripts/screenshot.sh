#!/bin/sh
# Open a screen on the paired iPhone via its deep link and save a screenshot.
# Usage: scripts/screenshot.sh discover /tmp/out.png [wait-seconds]
set -e
UDID=$(xcrun devicectl list devices 2>/dev/null | grep physical | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}' | head -1)
BUNDLE=$(sed -n 's/^PRODUCT_BUNDLE_IDENTIFIER *= *//p' ios/Local.xcconfig)
xcrun devicectl device process launch --terminate-existing --device "$UDID" --payload-url "whattowatch://$1" "$BUNDLE" >/dev/null
sleep "${3:-5}"
xcrun devicectl device capture screenshot --device "$UDID" --destination "$2" >/dev/null
