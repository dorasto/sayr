#!/bin/sh
set -e

# Replace build-time placeholders with runtime env var values
replace_env() {
    local var_name=$1
    local placeholder=$2
    local value=$(eval echo \$$var_name)

    if [ -n "$value" ]; then
        echo "Replacing $placeholder with $value in .output folder..."
        find /app/.output -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.json" \) -exec sed -i "s|$placeholder|$value|g" {} +
    fi
}

replace_env "VITE_URL_ROOT" "___VITE_URL_ROOT___"
replace_env "VITE_PROJECT_NAME" "___VITE_PROJECT_NAME___"
replace_env "VITE_ROOT_DOMAIN" "___VITE_ROOT_DOMAIN___"
replace_env "VITE_GITHUB_APP_NAME" "___VITE_GITHUB_APP_NAME___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_DATASET" "___VITE_SAYR_FRONTEND_AXIOM_DATASET___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_TOKEN" "___VITE_SAYR_FRONTEND_AXIOM_TOKEN___"
replace_env "VITE_TENOR_API" "___VITE_TENOR_API___"
replace_env "VITE_SAYR_CLOUD" "___VITE_SAYR_CLOUD___"

# Patch Nitro's asset manifest in index.mjs to reflect post-sed file sizes.
# Without this, Nitro sends stale Content-Length headers causing NS_ERROR_NET_PARTIAL_TRANSFER.
echo "Patching Nitro asset manifest sizes..."
for file in /app/.output/public/assets/*.js /app/.output/public/assets/*.css; do
    [ -f "$file" ] || continue
    filename=$(basename "$file")
    actual_size=$(wc -c < "$file")
    actual_hex=$(printf '%x' "$actual_size")
    # Extract the build-time size from the manifest entry
    old_size=$(sed -n "/${filename}/{n;n;n;n;s/.*\"size\": *//;s/,.*//;p;}" /app/.output/server/index.mjs)
    [ -z "$old_size" ] && continue
    [ "$old_size" -eq "$actual_size" ] 2>/dev/null && continue
    old_hex=$(printf '%x' "$old_size")
    echo "  ${filename}: size ${old_size} -> ${actual_size} (0x${old_hex} -> 0x${actual_hex})"
    # Patch the decimal "size" and hex prefix in "etag"
    sed -i "s/\"size\": *${old_size}/\"size\": ${actual_size}/g; s/\"${old_hex}-/\"${actual_hex}-/g" /app/.output/server/index.mjs
done
echo "Asset manifest patched."

# Upload source maps to PostHog (first startup only)
SOURCEMAP_MARKER="/tmp/.posthog_sourcemaps_uploaded"
if [ -n "$POSTHOG_CLI_TOKEN" ] && [ -n "$POSTHOG_CLI_ENV_ID" ] && [ ! -f "$SOURCEMAP_MARKER" ]; then
    echo "Uploading source maps to PostHog..."
    POSTHOG_HOST="${VITE_PUBLIC_POSTHOG_HOST:-https://us.posthog.com}"
    if POSTHOG_CLI_HOST="$POSTHOG_HOST" posthog-cli sourcemap upload --directory /app/.output/public; then
        touch "$SOURCEMAP_MARKER"
        echo "Source maps uploaded successfully to $POSTHOG_HOST"
    else
        echo "Source map upload failed (non-fatal, continuing...)"
    fi
elif [ -f "$SOURCEMAP_MARKER" ]; then
    echo "Source maps already uploaded, skipping..."
fi

echo "Starting App..."
exec "$@"
