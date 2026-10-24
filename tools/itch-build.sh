#!/bin/sh
# Builds the zip for itch.io (HTML5 game): only the files the game needs, index.html at the zip root.
# Usage: sh tools/itch-build.sh   ->  dist/plush-squad-itch-<version>.zip
set -e
cd "$(dirname "$0")/.."
V=$(sed -n "s/.*const VERSION = '\([0-9.]*\)'.*/\1/p" js/game.js | head -1)
OUT="dist/plush-squad-itch-$V.zip"
mkdir -p dist && rm -f "$OUT"
git ls-files index.html manifest.json js assets vendor | zip -q -9 "$OUT" -@
N=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
echo "$OUT: $N files, $(du -h "$OUT" | cut -f1)"
