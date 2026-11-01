#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
build_dir=${SEMIDONE_BUILD_DIR:-"$project_dir/.build"}
sdk_path=${SEMIDONE_SDK:-$(xcrun --sdk macosx --show-sdk-path)}
developer_dir=$(xcode-select -p)
# CLT 27 lacks SwiftUIMacros. Its bundled 26 SDK uses the stable State wrapper
# and still produces apps that run on both macOS 26 and 27.
case "$developer_dir:$sdk_path" in
  *CommandLineTools*:*MacOSX27*|*CommandLineTools*:*MacOSX.sdk)
    if [ -z "${SEMIDONE_SDK:-}" ] && [ -d "$developer_dir/SDKs/MacOSX26.sdk" ]; then sdk_path="$developer_dir/SDKs/MacOSX26.sdk"; fi ;;
esac
mkdir -p "$build_dir/module-cache" "$build_dir/cache" "$build_dir/config" "$build_dir/security"
export CLANG_MODULE_CACHE_PATH="$build_dir/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$build_dir/module-cache"
action=${1:-build}
if [ "$#" -gt 0 ]; then shift; fi
if [ "$action" = test ]; then
  # Swift Testing is included with CLT; XCTest needs a full Xcode installation.
  set -- --disable-xctest "$@"
  testing_plugin="$developer_dir/usr/lib/swift/host/plugins/testing/libTestingMacros.dylib"
  case "$developer_dir" in *CommandLineTools*)
    if [ -f "$testing_plugin" ]; then set -- -Xswiftc -load-plugin-library -Xswiftc "$testing_plugin" "$@"; fi ;;
  esac
fi
if [ "${SEMIDONE_DISABLE_PACKAGE_SANDBOX:-0}" = 1 ]; then set -- --disable-sandbox "$@"; fi
exec xcrun swift "$action" --package-path "$project_dir" --scratch-path "$build_dir" --cache-path "$build_dir/cache" --config-path "$build_dir/config" --security-path "$build_dir/security" --sdk "$sdk_path" "$@"
