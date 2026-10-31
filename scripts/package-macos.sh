#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ] || [ "$(uname -m)" != arm64 ]; then
  echo '请在 Apple 芯片 Mac 上打包。' >&2
  exit 1
fi
npm run build:tauri -- --target aarch64-apple-darwin --bundles app
app_dir='src-tauri/target/aarch64-apple-darwin/release/bundle/macos'
version=$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version")
staging=$(mktemp -d "${TMPDIR:-/tmp}/semidone-dmg.XXXXXX")
trap 'rm -rf "$staging"' EXIT HUP INT TERM
ditto "$app_dir/事半·SemiDone.app" "$staging/事半·SemiDone.app"
ln -s /Applications "$staging/Applications"
mkdir -p release/macos
hdiutil create -volname 'SemiDone' -srcfolder "$staging" -ov -format UDZO "release/macos/SemiDone_${version}_aarch64.dmg"
(cd release/macos && shasum -a 256 "SemiDone_${version}_aarch64.dmg" > "SemiDone_${version}_aarch64.dmg.sha256")
