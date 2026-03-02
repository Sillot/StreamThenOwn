#!/bin/sh
# Package the extension for Chrome Web Store submission.
# Excludes source maps, metafile, and dev artifacts.

set -e

DIST_DIR="dist"
OUTPUT="streamthenown-$(node -p "require('./package.json').version").zip"

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ dist/ not found. Run 'make build' first."
  exit 1
fi

# Remove dev artifacts from dist before zipping
rm -f "$DIST_DIR"/*.map "$DIST_DIR"/metafile.json

cd "$DIST_DIR"
zip -r "../$OUTPUT" . -x "*.map" "metafile.json"
cd ..

echo "✅ Packaged: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
