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

I analyze the changes in a pull request and update its title and description with release-ready documentation. The PR description serves as the source material for release notes, so I create well-structured content that helps both reviewers and end users understand:

- What changed and why
- User-facing improvements and fixes
- Technical implementation details
- Impact on the codebase
- File changes summary

## When to use me

Use this skill when:
- You've created a PR and need a professional title and description
- A PR's description is outdated after additional commits
- You want to improve PR documentation for better code review
- You're preparing a PR for team review and want clear communication

## How I work

1. **Fetch PR details**: I retrieve the current PR information from GitHub
2. **Analyze changes**: I examine the commits, file changes, and diff to understand the scope and impact
3. **Craft release notes**: I create a well-structured description with:
   - User-focused summary suitable for release announcements
   - Release notes organized by category (features, fixes, improvements, etc.)
   - Technical details for developers reviewing the code
   - Complete file changes summary
4. **Update PR**: I use GitHub API to update the title and description
5. **Confirm**: I provide you with the PR URL to review the changes

## Title format

Focus on the PR's purpose and impact. Use a clear, concise title that summarizes what changed from a user or developer perspective. The title will be used as the release title, so make it meaningful.

Examples:
- "Add dark mode support to dashboard"
- "Fix authentication timeout issues"
- "Improve database query performance"
- "Update API documentation for v2 endpoints"

## Description structure

The PR description is structured to serve as release notes. Write in past tense and focus on user impact.

```markdown
## Summary
Brief, user-focused overview of what this release accomplishes. Write as if announcing the release to users or stakeholders.

Example: "Fixed critical authentication issues and improved dashboard performance by 40%."

## Release Notes

### New Features
- List new capabilities or functionality added
- Focus on what users can now do
- Include relevant context about why the feature was added

### Bug Fixes
- List issues that were resolved
- Describe the problem and the fix
- Reference issue numbers if applicable

### Improvements
- Performance enhancements
- Code quality improvements
- Refactoring that improves maintainability

### Documentation
- New or updated documentation
- API changes
- Migration guides

### Breaking Changes
- Any changes that require user action
- API changes that break compatibility
- Configuration changes

## Technical Details
Provide implementation details for developers:
- Key architectural decisions
- File paths and line references
- Code examples where helpful
- Performance metrics or benchmarks

## Files Changed
**New Files:**
- List new files with brief description of purpose

**Modified Files:**
- List modified files with description of changes

**Removed Files:**
- List removed files with reason for removal
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
3. Generate clear, release-focused title
4. Create structured description with release notes, technical details, and file changes
5. Update the PR via GitHub API
6. Confirm with the PR URL

## Notes

- I use the GitHub API, so the repo must be accessible
- I respect the existing PR structure (base branch, reviewers, etc.)
- I focus on clarity and completeness suitable for release notes
- I organize information to make both code review and release documentation easier
- The PR description will be used as release notes, so I write for both technical reviewers and end users
