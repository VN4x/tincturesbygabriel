#!/usr/bin/env bash
# Fail if tracked files look like live secrets. Does not print secret values.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
fail=0

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "tracked .env is forbidden (Lovable committed one on origin/main — do not copy it here)"
  fail=1
fi

# Live Stripe / Resend / service-role assignments in tracked files.
if git grep -I -nE 'sk_live_[A-Za-z0-9]+|SUPABASE_SERVICE_ROLE_KEY=.+|STRIPE_SECRET_KEY=sk_|RESEND_API_KEY=re_' \
  -- ':!.env.example' ':!*.md' >/dev/null 2>&1; then
  echo "tracked file contains a live-looking secret assignment"
  fail=1
fi

if git ls-files '*.epub' | grep -q .; then
  echo "EPUB files must not be committed"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "secrets check ok"
