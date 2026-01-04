#!/usr/bin/env bash
set -euo pipefail

echo "Publishing public/ -> docs/ ..."
rm -rf docs/*
cp -R public/* docs/

# GitHub Pages ignores files/folders starting with "_" unless you add .nojekyll
touch docs/.nojekyll

echo "Done."
