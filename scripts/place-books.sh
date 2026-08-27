#!/usr/bin/env bash
# Copy local EPUB files into gitignored private/books/. Never commit the books.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
mkdir -p private/books private/admin

copy_as() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" ]]; then
    cp -f "$src" "$dest"
    echo "copied $src -> $dest"
    return 0
  fi
  return 1
}

et_dest="private/books/metsa-vagi.epub"
en_dest="private/books/metsa-vagi.en.epub"

et_ok=0
en_ok=0

for src in \
  "private/books/metsa-vagi.epub" \
  "120326reflowable.epub" \
  "metsa-vagi.epub"
do
  if copy_as "$src" "$et_dest"; then et_ok=1; break; fi
done

for src in \
  "ForestPowerandHealth.epub" \
  "private/books/ForestPowerandHealth.epub" \
  "private/books/metsa-vagi.en.epub"
do
  if copy_as "$src" "$en_dest"; then en_ok=1; break; fi
done

# Also search the current directory for the English filename anywhere one level up
if [[ "$en_ok" -eq 0 ]]; then
  found="$(find . -maxdepth 3 -iname 'ForestPowerandHealth.epub' -print -quit 2>/dev/null || true)"
  if [[ -n "${found}" ]]; then
    copy_as "$found" "$en_dest" && en_ok=1
  fi
fi

echo "---"
if [[ "$et_ok" -eq 1 ]]; then echo "Estonian: $et_dest"; else echo "Estonian missing: put the ET EPUB at $et_dest"; fi
if [[ "$en_ok" -eq 1 ]]; then echo "English:  $en_dest (from ForestPowerandHealth.epub)"; else echo "English missing: copy ForestPowerandHealth.epub to $en_dest"; fi
echo "Vercel: these files stay gitignored and are copied into the serverless function at deploy time."
