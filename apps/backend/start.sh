#!/bin/sh

set -e

echo "Running Drizzle migrations..."

drizzle-kit migrate --config=packages/database/drizzle.config.ts

echo "Starting backend server..."
bun run dist/index.js