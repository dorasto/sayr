#!/bin/sh
set -e

echo "Running Drizzle migrations..."
bun run migrate.js

echo "Starting backend server..."
bun run dist/index.js
