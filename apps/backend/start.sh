#!/bin/sh
set -e

bun run migrate.js

echo "Starting backend server..."
bun run dist/index.js
