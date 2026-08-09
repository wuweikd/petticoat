#!/bin/sh
set -eu

# Sealos Postgres default DB contains platform objects; use a dedicated app DB.
base_url="${DATABASE_URL%/*}"
admin_url="${base_url}/postgres"
app_url="${base_url}/petticoat"

echo "Ensuring database petticoat exists..."
echo 'CREATE DATABASE petticoat;' | ./node_modules/.bin/prisma db execute --stdin --url "$admin_url" || true

export DATABASE_URL="$app_url"
echo "Pushing Prisma schema..."
./node_modules/.bin/prisma db push --skip-generate

echo "Starting Petticoat API..."
exec node dist/src/main.js
