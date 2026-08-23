#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
EXAMPLE_FILE="$ROOT/.env.example"

APPS=(
  apps/web
  agents/booking-agent
  agents/rebook-agent
  agents/routing-agent
  agents/disruption-guard
  agents/journey-concierge
  agents/flight-guardian
  agents/travel-sentinel
)

relpath() {
  python3 -c "import os; print(os.path.relpath('$1', '$2'))"
}

for app in "${APPS[@]}"; do
  target_dir="$ROOT/$app"
  if [[ ! -d "$target_dir" ]]; then
    echo "skip missing directory: $app" >&2
    continue
  fi

  if [[ ! -e "$ENV_FILE" ]]; then
    if [[ -e "$EXAMPLE_FILE" ]]; then
      cp "$EXAMPLE_FILE" "$ENV_FILE"
      echo "created $ENV_FILE from .env.example"
    else
      echo "error: $ENV_FILE not found and no .env.example to copy" >&2
      exit 1
    fi
  fi

  env_link="$(relpath "$ENV_FILE" "$target_dir")"
  ln -sfn "$env_link" "$target_dir/.env"
  echo "linked $app/.env -> $env_link"

  example_link="$(relpath "$EXAMPLE_FILE" "$target_dir")"
  ln -sfn "$example_link" "$target_dir/.env.example"
  echo "linked $app/.env.example -> $example_link"
done

echo "done — edit secrets in $ENV_FILE"
