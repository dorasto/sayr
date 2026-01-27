---
name: update-pr
description: Update GitHub pull request title and description with comprehensive summary
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: github
---

## What I do

I analyze the changes in a pull request and update its title and description to provide a clear, comprehensive summary. I create well-structured PR descriptions that help reviewers understand:

- What changed and why
- Key technical improvements
- Impact on the codebase
- Testing considerations
- File changes summary

## When to use me

Use this skill when:
- You've created a PR and need a professional title and description
- A PR's description is outdated after additional commits
- You want to improve PR documentation for better code review
- You're preparing a PR for team review and want clear communication

## How I work

1. **Fetch PR details**: I retrieve the current PR information from GitHub
2. **Analyze changes**: I examine the commits, file changes, and diff to understand the scope
3. **Craft comprehensive description**: I create a well-structured description with:
   - Executive summary
   - Key changes organized by category
   - Technical details with file references
   - Testing plan or considerations
   - Files changed summary
4. **Update PR**: I use GitHub API to update the title and description
5. **Confirm**: I provide you with the PR URL to review the changes

## Title format

I follow conventional commit format for PR titles:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code improvements without behavior change
- `docs:` for documentation updates
- `chore:` for maintenance tasks
- `test:` for test additions or fixes

The title format should be based off the PR label applied.

## Description structure

```markdown
## Summary
Brief overview of what this PR accomplishes. Word it like release notes; not like a PR description.


## Release notes
Generate release notes on
### New features
### Documentation
### Chores
### Refactors
### Overview

## Key Changes
### Category 1
- Bullet points of changes
- With relevant context

### Category 2
- More organized changes

## Technical Details
File paths and line references where helpful

## Files Changed
**New Files:**
- List of new files

**Modified Files:**
- List of modified files with brief description
```

## What I need from you

Provide the PR URL or PR number. I'll handle the rest.

Examples:
- "Update PR #123"
- "Update pull request https://github.com/owner/repo/pull/456"
- "Improve the description for PR 789"

## What I won't do

- I won't merge or close PRs
- I won't modify PR labels or reviewers
- I won't change the PR's base or head branch
- I won't push new commits to the PR branch

## Example usage

**User**: "Update PR #62"

**I will**:
1. Fetch PR #62 details from GitHub
2. Analyze the commits and changes
3. Generate comprehensive title following conventional commits
4. Create structured description with summary, changes, technical details, and files
5. Update the PR via GitHub API
6. Confirm with the PR URL

## Notes

- I use the GitHub API, so the repo must be accessible
- I respect the existing PR structure (base branch, reviewers, etc.)
- I focus on clarity and completeness in descriptions
- I organize information to make code review easier
