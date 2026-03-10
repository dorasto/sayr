#!/usr/bin/env bash

# Get current branch
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown-branch')"

# Try to get PR number from GitHub CLI based on current branch
auto_pr_number="$(
  gh pr view --json number -q '.number' 2>/dev/null || echo ""
)"

PR_number="$auto_pr_number"

if [ -n "$auto_pr_number" ]; then
  echo "Detected PR #$auto_pr_number for branch '$branch'."
  read -r -p "Is this the correct PR? [Y/n]: " answer
  answer="${answer:-Y}"
  if [[ "$answer" =~ ^[Nn]$ ]]; then
    PR_number=""
  fi
fi

# If we don't have a PR number yet, ask for it manually
if [ -z "$PR_number" ]; then
  read -r -p "Enter PR number manually (or leave blank to abort): " manual_pr
  if [ -z "$manual_pr" ]; then
    echo "No PR number provided. Exiting."
    exit 1
  fi
  PR_number="$manual_pr"
fi


echo "📦 current branch: $branch"
prompt="use update-pr to update this PR https://github.com/dorasto/sayr/pull/$PR_number"
echo $prompt
opencode -m "opencode/minimax-m2.5-free" --prompt "$prompt"