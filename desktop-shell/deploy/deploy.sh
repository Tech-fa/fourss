#!/bin/bash
set -euo pipefail

if [ -z "${PUBLIC_IP:-}" ]; then
  echo "PUBLIC_IP is required." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2
fi

systemctl enable --now docker

cd /opt/fourss
mkdir -p desktop-shell/deploy
printf '%s\n' "{\"apiUrl\":\"http://${PUBLIC_IP}:3012\"}" > desktop-shell/deploy/ui-config.json

export COMPOSE_BAKE=false
export BUILDKIT_PROGRESS=plain
compose=(docker compose --env-file desktop-shell/deploy/.env -f desktop-shell/deploy/docker-compose.yml)
# One image at a time. A 4 GB droplet runs out of memory if both installs run together.
"${compose[@]}" build api
"${compose[@]}" build ui
"${compose[@]}" up -d
echo "App is available at http://${PUBLIC_IP}"
