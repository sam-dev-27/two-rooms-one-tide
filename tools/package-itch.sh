#!/bin/sh
# Builds dist/ and two-rooms-one-tide.zip for itch.io (index.html at the zip root).
set -e
cd "$(dirname "$0")/.."

node tools/test-chain.mjs

rm -rf dist two-rooms-one-tide.zip
mkdir -p dist
cp index.html dist/
cp -R lib src assets dist/
find dist -name '.DS_Store' -delete
find dist -name '.gitkeep' -delete

# Generated art is 2-5 MB per image. Ship 1280-wide JPEG backgrounds and smaller sprites;
# Boot picks up the .jpg through the manifest.
if command -v sips >/dev/null 2>&1; then
  for f in dist/assets/rooms/*.png dist/assets/ui/*.png dist/assets/cutscene/*.png; do
    [ -e "$f" ] || continue
    sips -Z 1280 -s format jpeg -s formatOptions 84 "$f" --out "${f%.png}.jpg" >/dev/null && rm "$f"
  done
  for f in dist/assets/characters/*.png; do
    [ -e "$f" ] || continue
    sips -Z 1024 "$f" >/dev/null
  done
  for f in dist/assets/items/*.png; do
    [ -e "$f" ] || continue
    sips -Z 384 "$f" >/dev/null
  done
else
  echo "warning: sips not found, shipping full-size images"
fi

node tools/manifest.mjs dist

(cd dist && zip -qr ../two-rooms-one-tide.zip .)
echo "Built two-rooms-one-tide.zip ($(du -h two-rooms-one-tide.zip | cut -f1)). Upload it to itch.io as an HTML game."
