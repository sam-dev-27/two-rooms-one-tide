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
node tools/manifest.mjs dist

(cd dist && zip -qr ../two-rooms-one-tide.zip .)
echo "Built two-rooms-one-tide.zip ($(du -h two-rooms-one-tide.zip | cut -f1)). Upload it to itch.io as an HTML game."
