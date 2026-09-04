#!/usr/bin/env bash
# Brings up the local/dev stack on a clean machine. Idempotent — safe to
# re-run after a pull. See SPEC.md §11 and §12 (Stage 0 DoD).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() {
  printf '\n\033[1;31merror:\033[0m %s\n' "$1" >&2
  exit 1
}

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

command -v docker >/dev/null 2>&1 || die "docker is required — https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "docker compose (v2 plugin) is required"

log "Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set_env_var_if_empty() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    local current
    current="$(sed -n "s/^${key}=//p" .env)"
    if [ -z "$current" ]; then
      sed -i.bak "s|^${key}=.*|${key}=${value}|" .env && rm -f .env.bak
      echo "Generated ${key}"
    fi
  else
    echo "${key}=${value}" >>.env
  fi
}

set_env_var_if_empty EMAIL_ENCRYPTION_KEY "$(openssl rand -hex 32)"
set_env_var_if_empty EMAIL_HASH_PEPPER "$(openssl rand -hex 32)"

log "Ensuring external network npm_network exists"
docker network inspect npm_network >/dev/null 2>&1 || docker network create npm_network

NPM_CACHE_DIR="$ROOT_DIR/.npm-cache"
NPM_HOME_DIR="$ROOT_DIR/.npm-home"
mkdir -p "$NPM_CACHE_DIR" "$NPM_HOME_DIR"

install_node_deps() {
  local dir="$1"
  log "Installing dependencies in ${dir}"
  docker run --rm \
    -u "$(id -u):$(id -g)" \
    -e HOME=/tmp/npm-home \
    -e npm_config_cache=/tmp/npm-cache \
    -v "$ROOT_DIR/$dir":/app \
    -v "$NPM_HOME_DIR":/tmp/npm-home \
    -v "$NPM_CACHE_DIR":/tmp/npm-cache \
    -w /app \
    node:22-alpine \
    npm ci
}

install_node_deps backend
install_node_deps frontend

log "Starting mongo and redis"
"${COMPOSE[@]}" up -d mongo redis

log "Waiting for mongo to accept connections"
mongo_up=false
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T mongo mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    mongo_up=true
    break
  fi
  sleep 2
done
[ "$mongo_up" = true ] || die "mongo did not start in time — check: docker compose logs mongo"

log "Ensuring the mongo replica set (rs0) is initiated"
already_initiated="$("${COMPOSE[@]}" exec -T mongo mongosh --quiet --eval "rs.status().ok === 1" 2>/dev/null || echo false)"
if [ "$already_initiated" != "true" ]; then
  # Explicit host (not the default self-detected one) so the replica set config
  # survives the mongo container being recreated with a different hostname —
  # `hostname: mongo` in docker-compose.yml keeps this stable either way.
  "${COMPOSE[@]}" exec -T mongo mongosh --quiet --eval \
    "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo:27017'}]})"
  echo "Replica set initiated"
else
  echo "Replica set already initiated"
fi

log "Building and starting the full stack"
"${COMPOSE[@]}" up -d --build

log "Waiting for the backend to become healthy"
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T backend node -e \
    "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    log "Stack is up"
    echo "  Frontend: http://localhost:5173"
    echo "  Only the frontend port is published — backend/mongo/redis/mailhog are reachable"
    echo "  from inside the compose network only. Use 'docker compose exec' or 'docker compose logs'."
    exit 0
  fi
  sleep 2
done

die "Backend did not become healthy in time — check: docker compose logs backend"
