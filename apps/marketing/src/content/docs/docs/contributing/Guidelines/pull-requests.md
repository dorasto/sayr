---
title: Pull Request Guidelines
description: How to submit high-quality pull requests to Sayr
sidebar:
   order: 7
---

This guide covers how to create and submit pull requests that are easy to review and likely to be merged.

## Before You Start

1. **Check existing issues** - Look for related issues or PRs before starting work
2. **Discuss large changes** - For significant features, open an issue first to discuss the approach
3. **Keep PRs focused** - One PR should address one concern (feature, bug fix, refactor)

## Branch Naming

Use descriptive branch names with a prefix:

| Prefix | Use Case |
|--------|----------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance tasks |

Examples:
- `feat/task-filtering`
- `fix/login-redirect-loop`
- `docs/contributing-guide`
- `refactor/task-service`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies |

### Examples

```bash
# Feature
feat(tasks): add task filtering by status

# Bug fix
fix(auth): resolve redirect loop on login

# With scope and body
feat(api): add rate limiting to public endpoints

Implements token bucket algorithm with configurable
limits per endpoint. Default is 100 requests per minute.

Closes #123
```

### Tips

- Use imperative mood: "add feature" not "added feature"
- Keep the first line under 72 characters
- Reference issues in the footer: `Closes #123`, `Fixes #456`

## Creating a Pull Request

### 1. Ensure Quality

Before creating your PR, run these checks locally:

```bash
# Lint your code
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Check types
pnpm check-types

# Run tests (if applicable)
pnpm -F start test
```

### 2. Write a Good Description

Your PR description should include:

**Summary**: What does this PR do? (1-2 sentences)

**Changes**: List the key changes made

**Testing**: How was this tested?

**Screenshots**: For UI changes, include before/after screenshots

**Related Issues**: Link to related issues

### PR Description Template

```markdown
## Summary
Brief description of what this PR accomplishes.

## Changes
- Added X component for Y functionality
- Updated Z service to handle edge case
- Fixed bug where A caused B

## Testing
- [ ] Tested locally with `pnpm dev`
- [ ] Added/updated tests
- [ ] Verified on multiple browsers (if UI change)

## Screenshots
<!-- For UI changes, add screenshots here -->

## Related Issues
Closes #123
```

### 3. Keep PRs Small

Aim for PRs that can be reviewed in 15-30 minutes:

- Under 400 lines of code changes (excluding generated files)
- Focused on a single concern
- Easy to understand without extensive context

If your change is large, consider splitting it into multiple PRs.

## Review Process

### What Reviewers Look For

1. **Correctness**: Does the code do what it's supposed to?
2. **Code style**: Does it follow our conventions?
3. **Performance**: Are there any obvious performance issues?
4. **Security**: Are there any security concerns?
5. **Tests**: Are there adequate tests?
6. **Documentation**: Are comments and docs updated?

### Responding to Feedback

- **Be responsive**: Try to address feedback within a few days
- **Ask questions**: If feedback is unclear, ask for clarification
- **Discuss disagreements**: It's okay to discuss, but be respectful
- **Update your PR**: Push new commits to address feedback

### Approval Requirements

- At least one approval from a maintainer
- All CI checks passing
- No unresolved conversations

## After Merging

- Delete your branch (GitHub can do this automatically)
- Close related issues if not auto-closed
- Update any related documentation if needed

## Common Issues

### CI Failures

**Lint errors:**
```bash
pnpm lint:fix
```

**Type errors:**
```bash
pnpm check-types
# Fix reported issues
```

**Test failures:**
```bash
pnpm -F start test
# Review and fix failing tests
```

### Merge Conflicts

If your branch has conflicts with `main`:

```bash
# Fetch latest changes
git fetch origin

# Rebase onto main
git rebase origin/main

# Resolve conflicts, then continue
git add .
git rebase --continue

# Force push (only on your feature branch!)
git push --force-with-lease
```

### Large PRs

If reviewers ask you to split your PR:

1. Identify logical groupings of changes
2. Create new branches for each group
3. Submit separate PRs
4. Reference the original PR in descriptions

## Checklist

Before marking your PR ready for review:

- [ ] Branch is up to date with `main`
- [ ] Code follows the style guide
- [ ] `pnpm lint` passes
- [ ] `pnpm check-types` passes
- [ ] Tests pass (if applicable)
- [ ] PR description is complete
- [ ] Screenshots added (for UI changes)
- [ ] Related issues linked
- [ ] No `console.log` or debug code left in
- [ ] No commented-out code
- [ ] Environment variables documented (if new)

## Getting Help

If you're stuck or have questions:

1. Comment on the related issue
2. Ask in the PR comments
3. Reach out on [GitHub Discussions](https://github.com/dorasto/sayr/discussions)

We're happy to help guide you through the process!
