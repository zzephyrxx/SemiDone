#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$project_dir/../.." && pwd)
"$project_dir/scripts/build-app.sh"
output_dir="$repo_dir/release/macos-native"
stage_dir=$(mktemp -d "${TMPDIR:-/tmp}/semidone-native-dmg.XXXXXX")
trap 'rm -rf "$stage_dir"' EXIT HUP INT TERM
ditto "$output_dir/SemiDone Native.app" "$stage_dir/SemiDone Native.app"
ln -s /Applications "$stage_dir/Applications"
dmg_name="SemiDone-Native_0.1.0_aarch64.dmg"
hdiutil create -volname "SemiDone Native" -srcfolder "$stage_dir" -ov -format UDZO "$output_dir/$dmg_name"
(cd "$output_dir" && shasum -a 256 "$dmg_name" > "$dmg_name.sha256")
printf '%s\n' "$output_dir/$dmg_name"
