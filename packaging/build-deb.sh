#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('./package.json').version")"
PACKAGE_NAME="tracerinfo_${VERSION}_all"
BUILD_DIR="$ROOT_DIR/.deb-build/$PACKAGE_NAME"
OUTPUT="$ROOT_DIR/$PACKAGE_NAME.deb"

rm -rf "$ROOT_DIR/.deb-build" "$OUTPUT"
mkdir -p "$BUILD_DIR/DEBIAN" "$BUILD_DIR/usr/lib/tracerinfo" "$BUILD_DIR/usr/bin"

npm ci
npm run build
npm ci --omit=dev

cp package.json package-lock.json "$BUILD_DIR/usr/lib/tracerinfo/"
cp -r dist drizzle node_modules "$BUILD_DIR/usr/lib/tracerinfo/"
cp packaging/tracerinfo "$BUILD_DIR/usr/bin/tracerinfo"
chmod 0755 "$BUILD_DIR/usr/bin/tracerinfo"

cat > "$BUILD_DIR/DEBIAN/control" <<CONTROL
Package: tracerinfo
Version: $VERSION
Section: utils
Priority: optional
Architecture: all
Depends: nodejs (>= 20)
Maintainer: TracerInfo contributors
Description: Public OSINT search CLI
 TracerInfo searches public sources and stores results locally in SQLite.
CONTROL

dpkg-deb --build "$BUILD_DIR" "$OUTPUT"
printf 'Created %s\n' "$OUTPUT"
