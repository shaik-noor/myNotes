#!/usr/bin/env bash
set -euo pipefail

mode="${1:-notarized}"
case "$mode" in
  ad-hoc|notarized) ;;
  *) echo 'Expected signing mode: ad-hoc or notarized' >&2; exit 1 ;;
esac

bundle="${2:-src-tauri/target/release/bundle}"
app="$bundle/macos/MyNotes.app"
test -d "$app"
codesign --verify --deep --strict --verbose=2 "$app"
signature="$(codesign -dv --verbose=4 "$app" 2>&1)"
if [ "$mode" = notarized ]; then
  printf '%s\n' "$signature" | /usr/bin/grep -q '^Authority=Developer ID Application:'
  printf '%s\n' "$signature" | /usr/bin/grep -q 'flags=.*runtime'
  xcrun stapler validate "$app"
  spctl --assess --type execute --verbose=4 "$app"
else
  printf '%s\n' "$signature" | /usr/bin/grep -q '^Signature=adhoc$'
  echo 'Ad-hoc signature verified. This does not pass Apple notarization; Open Anyway is required.'
fi

found=false
for dmg in "$bundle"/dmg/*.dmg; do
  [ -f "$dmg" ] || continue
  hdiutil verify "$dmg"
  found=true
done
if [ "$found" != true ]; then
  echo 'No DMG found' >&2
  exit 1
fi
