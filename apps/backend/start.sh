#!/bin/sh

set -x

echo "Running Drizzle migrations"

bunx --no-install drizzle-kit migrate --config packages/database/drizzle.config.ts

# echo "Starting backend server"

# bun run dist/index.js
