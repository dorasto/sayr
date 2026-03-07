#!/bin/sh
set -e

MANIFEST="/app/.output/server/index.mjs"

# Replace build-time placeholders with runtime env var values.
# Uses grep -rl to find only files containing the placeholder (fast),
# then runs sed only on those files instead of scanning all of .output.
replace_env() {
    var_name=$1
    placeholder=$2
    value=$(eval echo \$$var_name)

    if [ -n "$value" ]; then
        echo "Replacing $placeholder -> $value"
        grep -rl "$placeholder" /app/.output/ 2>/dev/null | while read -r file; do
            sed -i "s|$placeholder|$value|g" "$file"
        done
    fi
}

replace_env "VITE_URL_ROOT" "___VITE_URL_ROOT___"
replace_env "VITE_PROJECT_NAME" "___VITE_PROJECT_NAME___"
replace_env "VITE_ROOT_DOMAIN" "___VITE_ROOT_DOMAIN___"
replace_env "VITE_GITHUB_APP_NAME" "___VITE_GITHUB_APP_NAME___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_DATASET" "___VITE_SAYR_FRONTEND_AXIOM_DATASET___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_TOKEN" "___VITE_SAYR_FRONTEND_AXIOM_TOKEN___"
replace_env "VITE_KLIPY_API" "___VITE_KLIPY_API___"
replace_env "VITE_APP_VERSION" "___VITE_APP_VERSION___"

# Patch Nitro's asset manifest in index.mjs to reflect post-sed file sizes.
# Without this, Nitro sends stale Content-Length headers -> NS_ERROR_NET_PARTIAL_TRANSFER.
#
# Strategy: build a sed script that scopes each replacement to lines following
# the specific asset filename, avoiding cross-contamination between entries
# that share the same size value.
echo "Patching Nitro asset manifest sizes..."
patched=0
sed_script=""

for file in /app/.output/public/assets/*.js /app/.output/public/assets/*.css; do
    [ -f "$file" ] || continue
    filename=$(basename "$file")
    actual_size=$(wc -c < "$file")

    # Get the build-time size from the manifest
    size_line=$(grep -A 10 "$filename" "$MANIFEST" 2>/dev/null | grep '"size"' | head -1)
    [ -z "$size_line" ] && continue

    old_size=$(echo "$size_line" | sed 's/[^0-9]//g')
    [ -z "$old_size" ] && continue
    [ "$old_size" -eq "$actual_size" ] 2>/dev/null && continue

    actual_hex=$(printf '%x' "$actual_size")
    old_hex=$(printf '%x' "$old_size")
    echo "  ${filename}: size ${old_size} -> ${actual_size} (0x${old_hex} -> 0x${actual_hex})"
    patched=$((patched + 1))

    # Build scoped sed commands: when we see the filename, enter a range and
    # replace only the FIRST occurrence of size/etag within the next few lines.
    # The /filename/,/^  }/ range scopes to just that manifest block.
    sed_script="${sed_script}/${filename}/,/^[[:space:]]*}/ { s/\"size\": *${old_size}/\"size\": ${actual_size}/; s/\"${old_hex}-/\"${actual_hex}-/; }
"
done

if [ "$patched" -gt 0 ] && [ -n "$sed_script" ]; then
    # Apply all patches in a single sed pass (no cascading, scoped per block)
    printf '%s' "$sed_script" | sed -i -f /dev/stdin "$MANIFEST"
fi
echo "Asset manifest patched ($patched files updated)."

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
