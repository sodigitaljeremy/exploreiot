#!/usr/bin/env bash
# scripts/init-env.sh — Generate .env from .env.example if it doesn't exist
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env" ]; then
    echo ".env already exists. Skipping."
else
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "Created .env from .env.example."
    echo "Edit passwords in .env before production use."
fi
