#!/usr/bin/env bash
# Runs before `vite build` on Vercel. Generates a tiny demo EPUB when none is
# present so /read works without committing .epub files or running npm locally.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
mkdir -p private/books
DEST="private/books/metsa-vagi.epub"

if [[ -n "${BOOK_URL:-}" ]]; then
  echo "prepare-vercel-build: BOOK_URL set — skip local EPUB"
  exit 0
fi

if [[ -f "$DEST" ]]; then
  echo "prepare-vercel-build: using existing $DEST"
  exit 0
fi

if [[ "${VERCEL:-}" == "1" ]] || [[ "${GENERATE_DEMO_EPUB:-}" == "1" ]]; then
  python3 scripts/make-test-epub.py "$DEST"
  echo "prepare-vercel-build: wrote demo EPUB to $DEST (gitignored)"
else
  echo "prepare-vercel-build: no EPUB at $DEST (set BOOK_URL or VERCEL=1 for demo file)"
fi
