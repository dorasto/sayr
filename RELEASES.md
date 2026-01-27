# Release Management

Simple semantic versioning workflow using PR labels and git tags.

## How It Works

1. **Create PR** with your changes
2. **Add release label**:
   - `release:major` - Breaking changes (1.0.0 → 2.0.0)
   - `release:minor` - New features (1.0.0 → 1.1.0)
   - `release:patch` - Bug fixes (1.0.0 → 1.0.1)
   - `release:skip` - No release (docs, tests, CI)
3. **Merge PR** → Automatic release and deployment

## What Happens Automatically

When you merge a PR with a `release:*` label (not `release:skip`):

1. ✅ Git tag created based on latest tag (e.g., `v0.0.1`)
2. ✅ GitHub Release created with PR title and description
3. ✅ Docker images built and tagged (latest, v0.0.1, v0.0, v0)
4. ✅ Deployed to Railway in sequence

**That's it. One PR, one merge, automatic release.**

## Example

```bash
# PR #123: "fix: resolve websocket connection issue"
# Label: release:patch
# Latest tag: v0.0.0

# After merge:
# - New tag: v0.0.1
# - Release title: "fix: resolve websocket connection issue"
# - Release notes: PR body content
# - Docker images: latest, v0.0.1, v0.0, v0
# - Deployed to Railway
```

## Manual Release (if needed)

If you need to manually trigger a deployment:

1. Go to Actions → "Build and Deploy"
2. Click "Run workflow"
3. Enter version (e.g., `v1.2.3`) or leave blank for latest
4. Click "Run workflow"

## Troubleshooting

### PR merged but no release created
- Check that PR had a `release:*` label (not `release:skip`)
- Check GitHub Actions for any failures
- Ensure PR was merged to `main` branch

### Release created but deployment failed
- Check "Build and Deploy" workflow run
- Verify Railway credentials are set up correctly
- Check for Docker build errors

### Wrong version tag created
- Tags cannot be changed once pushed
- Create a new PR with correct label to create new tag
- Old tags can be deleted manually if needed
