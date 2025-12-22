#!/bin/bash
# gen.sh — Generate a .env.pass file template with 1Password secret references
# ----------------------------------------------------------------------
# Usage:
#   ./gen.sh <vault> <item> [output-file]
# Example:
#   ./gen.sh Sayr Start .env
# ----------------------------------------------------------------------

set -euo pipefail

# === CONFIG (defaults if args omitted) ===
VAULT="${1:-}"
ITEM="${2:-}"
OUTPUT_FILE="${3:-.env}"

echo "🛠️ Generating .env for op://$VAULT/$ITEM → $OUTPUT_FILE"
echo

# === Check for 1Password CLI ===
if ! command -v op &>/dev/null; then
  echo "❌ 1Password CLI ('op') not found in PATH."
  exit 1
fi

# === Check for jq (required for JSON parsing) ===
if ! command -v jq &>/dev/null; then
  echo "❌ jq not found in PATH. Install it with: sudo apt install jq"
  exit 1
fi

# === Fetch 1Password item JSON ===
FIELDS_JSON="$(op item get "$ITEM" --vault "$VAULT" --format json 2>/dev/null || true)"

if [[ -z "$FIELDS_JSON" ]]; then
  echo "❌ Error: Unable to retrieve '$ITEM' from vault '$VAULT'."
  exit 1
fi

# === Extract field labels using jq for proper JSON parsing ===
FIELDS=$(echo "$FIELDS_JSON" | jq -r '.fields[]? | .label // empty' | tr -d '\r')

if [[ -z "$FIELDS" ]]; then
  echo "❌ No fields found in item '$ITEM'."
  exit 1
fi

# === Write fresh file (ensuring UTF-8 w/o BOM or blank lines) ===
# Use printf instead of echo to avoid accidental newlines
: >"$OUTPUT_FILE"

# === Generate dotenv lines ===
count=0
while IFS= read -r field; do
  [[ -z "$field" ]] && continue
  # Convert spaces or weird chars in label to safe var names
  safe_field=$(echo "$field" | tr ' ' '_' | tr -cd 'A-Za-z0-9_')
  printf '%s="op://%s/%s/%s"\n' "$safe_field" "$VAULT" "$ITEM" "$field" >>"$OUTPUT_FILE"
  ((count++)) || true
done <<<"$FIELDS"

# === Re‑normalize line endings ===
# force LF (important if run on Windows Git Bash)
if command -v dos2unix &>/dev/null; then
  dos2unix "$OUTPUT_FILE" >/dev/null 2>&1 || true
else
  # Manual conversion fallback
  sed -i 's/\r$//' "$OUTPUT_FILE" || true
fi

echo
echo "✅ Done! Wrote $count environment variable references to $OUTPUT_FILE"
echo "------------------------------------------------------------"
head -n 20 "$OUTPUT_FILE"
echo "------------------------------------------------------------"
echo "💡 Run with: op run --env-file $OUTPUT_FILE -- bun run dev"