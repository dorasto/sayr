Migration to Bun — summary and developer guide

Overview
--------
This repository is being migrated from pnpm to Bun as the single package manager / runtime tool for development. The backend relies on Bun (Hono), so consolidating the repo to Bun avoids the earlier PATH/bin shadowing problem and ensures everyone runs the same runtime.

Changes already made
--------------------
- root package.json
  - Added workspaces: ["apps/*", "packages/*"] so Bun will discover the workspace.
  - Switched packageManager to "bun@1.2.21".
  - Added a convenience script "bootstrap": "bun install" to install deps.
- turbo.json
  - Replaced pnpm lockfile reference with bun.lockb in globalDependencies.
- apps/web/Dockerfile
  - Replaced pnpm steps with Bun equivalents (install Bun in the image, use bun install, bunx for binaries and bun run for scripts).
- apps/backend/package.json
  - (already) uses Bun to run the server: "bun --watch run index.ts".

What I could not complete in this environment
--------------------------------------------
- I attempted to run "bun install" in the workspace here, but the run was interrupted in this environment. That means:
  - bun.lockb was NOT generated here.
  - node_modules were NOT updated in this session.
  - I did not commit the lockfile or remove pnpm-lock.yaml / pnpm-workspace.yaml via git in this environment.

Required local / CI steps (exact commands to run locally or in CI)
----------------------------------------------------------------
1) Install Bun on your machine (recommended dev system setup):
   - macOS / Linux single-line installer (adapt if pinned version required):
     curl -fsSL https://bun.sh/install | bash
   - Confirm:
     bun --version

2) In the repo root, install dependencies via Bun and generate the lockfile:
   bun install
   - After bun install finishes, you should see bun.lockb in the repository root.

3) Commit the lockfile and remove pnpm artifacts:
   git add bun.lockb package.json apps/web/Dockerfile turbo.json apps/backend/package.json
   git rm pnpm-lock.yaml pnpm-workspace.yaml || true
   git commit -m "Migrate monorepo to Bun: packageManager, turbo config, Dockerfile; add bun.lockb and remove pnpm artifacts"

4) CI & Docker updates (what to check / update):
   - Ensure any CI workflow that previously used pnpm (install / run) uses Bun equivalents:
     - bun install
     - bun run <script> or bunx <binary> (bunx is the equivalent of pnpm exec)
   - For Dockerfiles, we updated apps/web/Dockerfile to install Bun in the image and use bun install + bunx/bun run. If you have other Dockerfiles, apply the same changes.

5) Local verification checklist (run these locally after finishing steps 1—3):
   - Run dev tasks:
     - At repo root: bun run dev  (this uses turbo dev)
     - Confirm both apps/web and apps/backend show persistent "running" tasks in the turbo UI (the backend should not immediately exit like before).
   - Confirm server endpoints:
     - Backend: curl http://localhost:5468/ should return the app root or other status 200 responses.
     - Web: next dev should still work (we are still using Node to run Next builds, Bun is only used as package manager here unless you choose otherwise).
   - Run production builds:
     - bun run build (repo-level) or run per-package build scripts and ensure outputs are produced.

6) Rollback plan (if something breaks):
   - Revert changes: git checkout -- package.json turbo.json apps/web/Dockerfile apps/backend/package.json
   - Re-add pnpm artifacts from history if you removed them:
     git checkout <commit-before-migration> -- pnpm-lock.yaml pnpm-workspace.yaml
   - Run pnpm install to restore the previous node_modules.

Notes & caveats
---------------
- Bun is used here as the package manager and to run the backend (Hono). Next.js (apps/web) remains a Node process for build + runtime (Next is Node-based). Bun can manage dependencies and run the Next binary via bunx, but Next's internal runtime is Node: ensure the Node runtime in production images remains correct.
- Some packages may include Node-native dependencies or use Node-specific CLIs; Bun can still be used to install/manage packages, but verify runtime compatibility for those packages.

Developer checklist to share with the team
-----------------------------------------
1. Install Bun on your machine: curl -fsSL https://bun.sh/install | bash
2. Run: bun install
3. If you had a pnpm-integrated workflow, remove pnpm tools from your shell PATH or ensure bun is used.
4. Start development: bun run dev (or turbo dev). If something fails, follow the rollback steps above.

If you want me to finish the migration in this environment I can:
- Re-run bun install here (may take time / network), create bun.lockb and commit it.
- git rm pnpm-lock.yaml and pnpm-workspace.yaml and commit the removals.
- Scan the repo for any remaining pnpm references and update any CI/workflow files.

Contact me which of the above you want me to attempt here (run/install/commit), or run the install + commit locally and I will help update CI and any remaining files and verify builds.
