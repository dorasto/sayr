#!/bin/sh
set -e

# Function to replace env vars in files
replace_env() {
    local var_name=$1
    local placeholder=$2
    local value=$(eval echo \$$var_name)

    if [ -n "$value" ]; then
        echo "Replacing $placeholder with $value in .output folder..."
        # Use find and sed to replace in all JS and HTML files in .output
        # We use | as delimiter for sed to avoid issues with / in URLs
        find /app/.output -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.json" \) -exec sed -i "s|$placeholder|$value|g" {} +
    fi
}

# List of variables to replace
replace_env "VITE_URL_ROOT" "___VITE_URL_ROOT___"
replace_env "VITE_PROJECT_NAME" "___VITE_PROJECT_NAME___"
replace_env "VITE_ROOT_DOMAIN" "___VITE_ROOT_DOMAIN___"
replace_env "VITE_GITHUB_APP_NAME" "___VITE_GITHUB_APP_NAME___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_DATASET" "___VITE_SAYR_FRONTEND_AXIOM_DATASET___"
replace_env "VITE_SAYR_FRONTEND_AXIOM_TOKEN" "___VITE_SAYR_FRONTEND_AXIOM_TOKEN___"
replace_env "VITE_TENOR_API" "___VITE_TENOR_API___"
replace_env "VITE_SAYR_CLOUD" "___VITE_SAYR_CLOUD___"

# Upload source maps to PostHog (only on first startup, only if credentials are provided)
# This enables readable stack traces in PostHog error tracking
SOURCEMAP_MARKER="/tmp/.posthog_sourcemaps_uploaded"
if [ -n "$POSTHOG_CLI_TOKEN" ] && [ -n "$POSTHOG_CLI_ENV_ID" ] && [ ! -f "$SOURCEMAP_MARKER" ]; then
    echo "📦 Uploading source maps to PostHog..."
    # Use VITE_PUBLIC_POSTHOG_HOST if set, otherwise default to US region
    POSTHOG_HOST="${VITE_PUBLIC_POSTHOG_HOST:-https://us.posthog.com}"
    if POSTHOG_CLI_HOST="$POSTHOG_HOST" posthog-cli sourcemap upload --directory /app/.output/public 2>/dev/null; then
        touch "$SOURCEMAP_MARKER"
        echo "✅ Source maps uploaded successfully to $POSTHOG_HOST"
    else
        echo "⚠️ Source map upload failed (non-fatal, continuing...)"
    fi
elif [ -f "$SOURCEMAP_MARKER" ]; then
    echo "⏭️ Source maps already uploaded, skipping..."
fi

echo "Starting App..."
exec "$@"