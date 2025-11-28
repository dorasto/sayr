#!/bin/sh
set -e

# Function to replace env vars in files
replace_env() {
    local var_name=$1
    local placeholder=$2
    local value=$(eval echo \$$var_name)

    if [ -n "$value" ]; then
        echo "Replacing $placeholder with $value in .next folder..."
        # Use find and sed to replace in all JS and HTML files in .next
        # We use | as delimiter for sed to avoid issues with / in URLs
        find /app/apps/web/.next -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) -exec sed -i "s|$placeholder|$value|g" {} +
    fi
}

# List of variables to replace
replace_env "NEXT_PUBLIC_URL_ROOT" "___NEXT_PUBLIC_URL_ROOT___"
replace_env "NEXT_PUBLIC_API_SERVER" "___NEXT_PUBLIC_API_SERVER___"
replace_env "NEXT_PUBLIC_PROJECT_NAME" "___NEXT_PUBLIC_PROJECT_NAME___"
replace_env "NEXT_PUBLIC_WS_URL" "___NEXT_PUBLIC_WS_URL___"
replace_env "NEXT_PUBLIC_ROOT_DOMAIN" "___NEXT_PUBLIC_ROOT_DOMAIN___"
replace_env "NEXT_PUBLIC_EXTERNAL_API_URL" "___NEXT_PUBLIC_EXTERNAL_API_URL___"
replace_env "NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN" "___NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN___"
replace_env "NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET" "___NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET___"

echo "Starting Next.js..."
exec "$@"
