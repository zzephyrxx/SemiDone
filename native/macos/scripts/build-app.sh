#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$project_dir/../.." && pwd)
configuration=${SEMIDONE_CONFIGURATION:-release}
"$project_dir/scripts/swift.sh" build -c "$configuration"
bin_dir=$("$project_dir/scripts/swift.sh" build -c "$configuration" --show-bin-path)
output_dir="$repo_dir/release/macos-native"
app_dir="$output_dir/SemiDone Native.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
install -m 755 "$bin_dir/SemiDoneNative" "$app_dir/Contents/MacOS/SemiDoneNative"
cp "$repo_dir/src-tauri/icons/icon.icns" "$app_dir/Contents/Resources/SemiDone.icns"
cat > "$app_dir/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.semidone.native</string>
<key>CFBundleName</key><string>SemiDone Native</string>
<key>CFBundleDisplayName</key><string>SemiDone Native</string>
<key>CFBundleExecutable</key><string>SemiDoneNative</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleIconFile</key><string>SemiDone.icns</string>
<key>LSMinimumSystemVersion</key><string>26.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
codesign --force --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"
printf '%s\n' "$app_dir"
