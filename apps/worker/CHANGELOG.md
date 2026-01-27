# worker

## 0.0.8

### Patch Changes

- 336eaa5: feat: implement semantic versioning with automated changeset workflow

  ## Summary

  This PR establishes a comprehensive semantic versioning system using Changesets with fully automated PR label-based changeset generation. The implementation eliminates manual changeset creation errors by enforcing PR labels and automatically generating changesets when PRs are merged to main.

  ## Release Notes

  ### New Features

  - **Automated Changeset Generation**: PRs merged to main automatically generate changeset files based on their `release:*` label
  - **PR Label Enforcement**: All PRs to main now require exactly one `release:*` label (major/minor/patch/skip) before merge
  - **Release Automation**: Version packages PR is automatically created and triggers GitHub releases when merged
  - **Multi-version Docker Tagging**: Docker images now tagged with `latest`, full semver, major.minor, and major-only tags
  - **Sequential Railway Deployment**: Services deploy in correct dependency order (traefik → backend → worker → start → marketing)
  - **Release Filtering in Views**: Tasks can now be filtered by release in saved views (`.../apps/start/src/components/pages/admin/settings/orgId/view-detail.tsx`)
  - **Release Slug Display**: Release UI now displays concise slugs instead of full names (`.../apps/start/src/components/tasks/shared/release.tsx`)

  ### Documentation

  - **RELEASES.md**: Comprehensive 235-line guide covering the complete release workflow, label meanings, troubleshooting scenarios, and examples for developers and maintainers

  ### Chores

  - **Version Reset**: All packages reset to `0.0.0` for fresh start with unified versioning
  - **Icon Improvements**: Labels UI now uses semantically correct `IconTag` instead of `IconPlus` in compact view
  - **1Password Integration**: Development script updated to force-overwrite local `.env.local` files with 1Password secrets

  ### Refactors

  - **Unified Versioning**: All apps (`start`, `backend`, `worker`, `marketing`) and workspace packages now share the same version number via Changesets "fixed" configuration
  - **Changesets Configuration**: Updated to include all publishable packages and ignore config-only packages (`@repo/typescript-config`, `@repo/biome-config`)

  ### Overview

  This PR introduces a production-ready semantic versioning workflow that:

  - Prevents human error in version management through automation
  - Ensures consistent versioning across the entire monorepo
  - Provides clear documentation for team members
  - Establishes a scalable release process for future growth
  - Integrates seamlessly with existing CI/CD pipelines

  ## Key Changes

  ### Automated Workflows

  **PR Label Enforcement** (`.github/workflows/pr-label-check.yml`)

  - Runs on PR open, label, unlabel, and synchronize events
  - Blocks merge if no `release:*` label is present
  - Auto-comments with instructions and available label options
  - Updates or removes comment when label is added/removed

  **Auto Changeset Generation** (`.github/workflows/auto-changeset.yml`)

  - Triggers when PR is merged to main
  - Detects release type from PR labels (`release:major`, `release:minor`, `release:patch`, `release:skip`)
  - Generates changeset file with PR title and body
  - Commits changeset to main branch
  - Comments on PRs without labels or with `release:skip`

  **Release Workflow** (`.github/workflows/release.yml`)

  - Runs on push to main branch
  - Uses Changesets Action to create "Version Packages" PR
  - Publishes GitHub releases when Version Packages PR is merged
  - Triggers build-and-deploy workflow with version parameter

  ### Build & Deploy Improvements

  **Multi-version Docker Tagging** (`.github/workflows/build-and-deploy.yml`)

  - Images tagged with `latest` for rolling updates
  - Full semver tag (e.g., `v1.2.3`) for pinned deployments
  - Major.minor tag (e.g., `v1.2`) for automatic patch updates
  - Major-only tag (e.g., `v1`) for automatic minor and patch updates
  - Workflow now accepts `version` input for release builds

  **Sequential Railway Deployment**

  - Replaced parallel matrix strategy with sequential deployments
  - Ensures proper service startup order with `--watch` flag
  - Order: traefik (reverse proxy) → backend (API) → worker (jobs) → start (frontend) → marketing (docs)

  ### Version Management

  **Changesets Configuration** (`.changeset/config.json`)

  - Fixed versioning strategy: all packages bump together
  - Includes: `start`, `backend`, `worker`, `marketing`, `@repo/auth`, `@repo/database`, `@repo/storage`, `@repo/ui`, `@repo/util`, `@repo/opentelemetry`, `@repo/queue`
  - Ignores: `@repo/typescript-config`, `@repo/biome-config`

  **Package Version Reset**

  - All 13 packages reset from `0.0.7` to `0.0.0`
  - First release will be `0.0.1` (using `release:patch` label)

  ### UI Enhancements

  **Release Filtering** (`apps/start/src/components/pages/admin/settings/orgId/view-detail.tsx:105`)

  - Added `releases` context to view filter editor
  - Users can now filter tasks by specific releases in saved views

  **Release Display** (`apps/start/src/components/tasks/shared/release.tsx:47`)

  - Release picker shows slug in trigger when selected
  - Standalone release badge displays slug for concise identification

  **Label Display** (`apps/start/src/components/tasks/shared/label.tsx:38`)

  - Compact view now uses `IconTag` instead of `IconPlus` when no labels present
  - Improved semantic alignment of icons

  ## Technical Details

  ### Release Labels

  | Label           | Version Bump      | Use Case                                       | Example                                |
  | --------------- | ----------------- | ---------------------------------------------- | -------------------------------------- |
  | `release:major` | 1.0.0 → 2.0.0     | Breaking changes, API redesign, schema changes | Redesigning task API                   |
  | `release:minor` | 1.0.0 → 1.1.0     | New features, enhancements                     | Adding AI changelog, release filtering |
  | `release:patch` | 1.0.0 → 1.0.1     | Bug fixes, small tweaks, dependency updates    | Fixing broken UI, updating deps        |
  | `release:skip`  | No version change | Docs, tests, CI, refactoring                   | Updating README, adding tests          |

  ### Workflow Execution

  1. Developer creates PR with feature/fix changes
  2. Developer adds appropriate `release:*` label
  3. PR is reviewed and approved
  4. PR is merged to main
  5. `auto-changeset.yml` workflow runs:
     - Reads PR label
     - Generates changeset file
     - Commits to main
  6. `release.yml` workflow runs:
     - Changesets Action detects pending changes
     - Creates "Version Packages" PR with updated versions and CHANGELOG
  7. Maintainer reviews and merges "Version Packages" PR
  8. `release.yml` workflow runs again:
     - Publishes GitHub release
     - Triggers `build-and-deploy.yml` with version tag
  9. `build-and-deploy.yml` workflow runs:
     - Builds multi-arch Docker images
     - Tags with all version formats
     - Deploys to Railway in sequence

  ### Docker Image Tags

  For release `v1.2.3`, the following tags are created:

  ```
  ghcr.io/dorasto/sayr-backend:latest
  ghcr.io/dorasto/sayr-backend:v1.2.3
  ghcr.io/dorasto/sayr-backend:v1.2
  ghcr.io/dorasto/sayr-backend:v1
  ```

  This allows flexible deployment strategies:

  - `latest` - Always get the newest release (rolling updates)
  - `v1.2.3` - Pin to exact version (production stability)
  - `v1.2` - Get patches automatically, avoid breaking changes
  - `v1` - Get all updates within major version

  ## Files Changed

  **New Files:**

  - `.github/workflows/auto-changeset.yml` (129 lines) - Automated changeset generation from PR labels
  - `.github/workflows/pr-label-check.yml` (99 lines) - PR label enforcement with automated comments
  - `.github/workflows/release.yml` (70 lines) - Version packages PR creation and GitHub releases
  - `RELEASES.md` (235 lines) - Complete release management documentation and troubleshooting guide

  **Modified Files:**

  - `.changeset/config.json` - Added all apps/packages to fixed versioning, configured ignore list
  - `.github/workflows/build-and-deploy.yml` - Added multi-version tagging, workflow call support, sequential Railway deployment
  - `apps/backend/package.json` - Version 0.0.7 → 0.0.0
  - `apps/marketing/package.json` - Version 0.0.7 → 0.0.0
  - `apps/start/package.json` - Version 0.0.7 → 0.0.0
  - `apps/start/src/components/pages/admin/settings/orgId/view-detail.tsx` - Added release filtering context
  - `apps/start/src/components/pages/admin/settings/orgId/view-filter-editor.tsx` - Added releases parameter
  - `apps/start/src/components/tasks/shared/label.tsx` - IconTag in compact view
  - `apps/start/src/components/tasks/shared/release.tsx` - Display release slug
  - `apps/start/src/components/tasks/task/task-content.tsx` - Task release picker updates
  - `apps/worker/package.json` - Version 0.0.7 → 0.0.0
  - `package.json` - Root version 0.0.7 → 0.0.0
  - `packages/auth/package.json` - Version 0.0.7 → 0.0.0
  - `packages/database/package.json` - Version 0.0.7 → 0.0.0
  - `packages/opentelemetry/package.json` - Version 0.0.7 → 0.0.0
  - `packages/queue/package.json` - Version 0.0.7 → 0.0.0
  - `packages/storage/package.json` - Version 0.0.7 → 0.0.0
  - `packages/ui/package.json` - Version 0.0.7 → 0.0.0
  - `packages/util/package.json` - Version 0.0.7 → 0.0.0

  **Stats:** 23 files changed, 2,847 insertions(+), 2,063 deletions(-)

  ## Testing Checklist

  After merging this PR, create a test PR with `release:patch` label to verify:

  - [ ] PR label enforcement workflow blocks merge without label
  - [ ] PR label enforcement workflow allows merge with label
  - [ ] Changeset file is auto-generated after merge
  - [ ] "Version Packages" PR is created by Changesets bot
  - [ ] Version packages PR shows correct version bump (0.0.0 → 0.0.1)
  - [ ] CHANGELOG.md is updated in version packages PR
  - [ ] GitHub release is created when version packages PR is merged
  - [ ] Docker images are tagged with all 4 version formats
  - [ ] Railway deployment executes in correct order
  - [ ] All services start successfully

  ## Breaking Changes

  None. This PR introduces new infrastructure without changing existing functionality.

  ## Migration Notes

  **For Developers:**

  - All future PRs to `main` must include exactly one `release:*` label
  - The workflow will comment on your PR with instructions if label is missing
  - Choose the appropriate label based on the change type (see RELEASES.md)

  **For Maintainers:**

  - A "Version Packages" PR will be automatically created when changes accumulate
  - Review the version bump and CHANGELOG before merging
  - Merging the Version Packages PR triggers release and deployment
  - See RELEASES.md for troubleshooting and manual release procedures

- 48cea11: Configure Changesets and GitHub release workflow
- Updated dependencies [336eaa5]
- Updated dependencies [48cea11]
  - @repo/database@0.0.8
  - @repo/util@0.0.8
  - @repo/opentelemetry@0.0.8

## 0.0.7

### Patch Changes

- efe75f4: fixed internal auth between worker and backend
- Updated dependencies [efe75f4]
  - @repo/database@0.0.7
  - @repo/util@0.0.7

## 0.0.6

### Patch Changes

- 8c4e148: adding redis for queue system
- Updated dependencies [8c4e148]
  - @repo/database@0.0.6
  - @repo/util@0.0.6
