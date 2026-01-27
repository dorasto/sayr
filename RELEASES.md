# Release Management & Semantic Versioning

This project uses a standardized semantic versioning (SemVer) workflow with automated release management.

## Overview

Our release process follows industry standards using **Changesets** with **PR Labels** to automate version bumping and release creation.

### Release Flow

```
1. Developer creates PR → Adds release label
2. PR is reviewed and merged to main
3. Auto-changeset workflow generates changeset file
4. Changesets bot creates "Version Packages" PR
5. Merge "Version Packages" PR → Triggers release workflow
6. Docker images built with version tags
7. GitHub Release created with changelog
8. Deployment to Railway
```

## For Developers

### Creating a Pull Request

Every PR to `main` **must** have exactly one release label:

- 🔴 **`release:major`** - Breaking changes (1.0.0 → 2.0.0)
  - Use for: API changes, database schema changes, major refactors
  - Example: Redesigning the task API, removing deprecated features

- 🟡 **`release:minor`** - New features (1.0.0 → 1.1.0)
  - Use for: New features, enhancements, significant improvements
  - Example: Adding release management, new UI components

- 🟢 **`release:patch`** - Bug fixes (1.0.0 → 1.0.1)
  - Use for: Bug fixes, small tweaks, dependency updates
  - Example: Fixing a broken button, correcting a typo

- ⚪ **`release:skip`** - No release needed
  - Use for: Documentation, tests, CI changes, refactoring without behavior change
  - Example: Updating README, adding tests, fixing workflows

### Label Enforcement

- A GitHub Action will comment on your PR reminding you to add a label
- PRs **cannot be merged** without a release label
- If you forget, the PR check will fail

### What Happens After Merge

1. **Immediately after merge**: An automated workflow generates a changeset file
2. **Within minutes**: Changesets bot creates a "Version Packages" PR
3. **When ready**: A maintainer merges the "Version Packages" PR
4. **Automatically**: Release is published and deployed

## For Maintainers

### Merging the "Version Packages" PR

The "Version Packages" PR is automatically created by Changesets when there are pending changes.

**Before merging, verify:**
- [ ] Version bump is correct (check package.json changes)
- [ ] CHANGELOG.md entries are accurate
- [ ] No breaking changes in a patch/minor release
- [ ] All CI checks pass

**To merge:**
1. Review the PR
2. Click "Merge" (do not squash - preserve the version commit)
3. Release workflow triggers automatically

### Release Workflow

When "Version Packages" PR is merged:

1. **GitHub Release Created**
   - Version tag created (e.g., `v1.2.3`)
   - Changelog auto-generated from changeset descriptions

2. **Docker Images Built**
   - Images tagged with:
     - `latest`
     - `v1.2.3` (full version)
     - `v1.2` (major.minor)
     - `v1` (major only)

3. **Deployment to Railway**
   - Services deployed in order:
     1. traefik
     2. backend
     3. worker
     4. start
     5. marketing
   - Each deployment waits for previous to complete

### Manual Release

If you need to trigger a release manually:

1. Go to Actions → "Build and Deploy"
2. Click "Run workflow"
3. Select branch and run

## Versioning Strategy

### Unified Versioning

All apps and packages share the same version number:
- `start@1.2.3`
- `backend@1.2.3`
- `worker@1.2.3`
- `marketing@1.2.3`
- All `@repo/*` packages: `1.2.3`

This ensures consistency across the entire monorepo.

### Version Number Meaning

Following [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
  1  .  2  .  3

MAJOR: Breaking changes
MINOR: New features (backwards compatible)
PATCH: Bug fixes (backwards compatible)
```

## Docker Image Tags

Every release creates multiple tags for flexibility:

```bash
# Latest (always points to most recent release)
ghcr.io/sayr/sayr-backend:latest

# Specific version (pinned)
ghcr.io/sayr/sayr-backend:v1.2.3

# Minor version (updates with patches)
ghcr.io/sayr/sayr-backend:v1.2

# Major version (updates with minors and patches)
ghcr.io/sayr/sayr-backend:v1
```

**Production recommendation**: Use `v1.2` tags to get patches automatically while avoiding breaking changes.

## Troubleshooting

### "No release label" error on merged PR

If a PR was merged without a label:

1. Add the appropriate label to the closed PR
2. Go to Actions → "Auto-Generate Changeset"
3. Find the failed run and click "Re-run jobs"

### Changeset file not generated

Check the Actions tab for the "Auto-Generate Changeset" workflow:
- If failed, check the logs
- Ensure the PR has exactly one `release:*` label
- Verify GitHub Actions has write permissions

### "Version Packages" PR not created

This is normal if:
- All recent PRs used `release:skip`
- No changes have accumulated since last release

To force a release:
1. Create a manual changeset: `pnpm changeset`
2. Commit and push to main
3. Changesets will create the PR

### Need to skip the "Version Packages" PR

You can't and shouldn't - this is by design. The extra PR:
- Allows review of version bumps before release
- Keeps git history clean
- Follows open source best practices (Remix, Radix, Tailwind all do this)

If you need faster releases, consider batching multiple features into one PR.

## Examples

### Example: Bug Fix PR

```
PR Title: "fix: Correct task filtering on releases page"
Label: release:patch
Result: v1.2.3 → v1.2.4
```

### Example: New Feature PR

```
PR Title: "feat: Add AI-generated changelog descriptions"
Label: release:minor
Result: v1.2.3 → v1.3.0
```

### Example: Breaking Change PR

```
PR Title: "refactor!: Redesign task API for better performance"
Label: release:major
Result: v1.2.3 → v2.0.0
```

### Example: Documentation Update

```
PR Title: "docs: Update release management documentation"
Label: release:skip
Result: No version bump, no release
```

## Configuration Files

- `.changeset/config.json` - Changesets configuration
- `.github/workflows/auto-changeset.yml` - Auto-generates changesets from PR labels
- `.github/workflows/release.yml` - Creates "Version Packages" PR and handles releases
- `.github/workflows/build-and-deploy.yml` - Builds Docker images and deploys
- `.github/workflows/pr-label-check.yml` - Enforces release labels on PRs

## Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning Spec](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
