#!/usr/bin/env bash
# Refresh the gitignored lovable/ snapshot from origin/main.
# Never merge or pull Lovable into this working tree.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [[ "${1:-}" == "--merge" || "${1:-}" == "--pull" ]]; then
  echo "refusing: do not git pull/merge Lovable into this working tree" >&2
  exit 2
fi

git fetch origin main
if git worktree list --porcelain | grep -q "^worktree ${ROOT}/lovable$"; then
  git -C lovable fetch origin main
  git -C lovable checkout --detach origin/main
else
  rm -rf lovable
  git worktree add --detach lovable origin/main
fi

echo "lovable/ is detached at $(git -C lovable rev-parse --short HEAD)"
echo "Port UI by hand. Do not git pull origin/main into ${ROOT}."
