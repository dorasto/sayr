#!/bin/sh
set -e

# Parse DATABASE_URL
# Example format: postgres://user:pass@host:port
export POSTGRES_USER=$(echo $DATABASE_URL | sed -E 's#postgres://([^:]+):.*#\1#')
export POSTGRES_PASSWORD=$(echo $DATABASE_URL | sed -E 's#postgres://[^:]+:([^@]+)@.*#\1#')

# Optional: POSTGRES_DB defaults to "postgres" if not set
export POSTGRES_DB=${POSTGRES_DB:-postgres}

# Call original postgres entrypoint
exec docker-entrypoint.sh postgres