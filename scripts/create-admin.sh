#!/usr/bin/env bash
# Interactive first-admin creation (SPEC.md D-16, §11). Requires the stack to
# already be running (scripts/install.sh for dev, or docker compose up for
# prod) — this execs into the running `backend` container.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

die() {
  printf '\n\033[1;31merror:\033[0m %s\n' "$1" >&2
  exit 1
}

if [ -z "$(docker compose -f docker-compose.yml ps -q backend 2>/dev/null)" ]; then
  die "the 'backend' service isn't running — start the stack first."
fi

# The prod image (nest build/tsc) has dist/scripts/create-admin.js; the dev
# image (nest start --watch, webpack, main.ts-only bundle) doesn't, but has
# ts-node available instead. No -T: this needs a real TTY for the prompts.
if docker compose -f docker-compose.yml exec backend test -f dist/scripts/create-admin.js; then
  docker compose -f docker-compose.yml exec backend node dist/scripts/create-admin.js
else
  docker compose -f docker-compose.yml exec backend npm run create-admin
fi
