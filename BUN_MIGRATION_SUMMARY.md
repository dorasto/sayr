Bun migration — short summary & reasoning

Problem (what broke)
- Running `turbo dev` at repo root would show the backend `dev` script print the bun command then immediately finish. The backend would not stay running under Turbo — the task appeared to exit.
- Manual `cd apps/backend && bun run index.ts` worked fine. This led to confusing, platform‑dependent behaviour: some devs (Windows) never saw the issue, Linux users did.

Root cause (why it happened)
- The backend package listed a dependency named `bun` in its package.json. pnpm (and the npm script runner) prepends the package's local ./node_modules/.bin to PATH when running scripts.
- When Turbo/pnpm executed the `dev` script, the local `node_modules/.bin/bun` (the npm package) was executed instead of the *system* Bun runtime (~/.bun/bin/bun). That local binary did not behave the same as the real Bun runtime and exited, so Turbo thought the task finished.

What I changed (practical fixes applied)
- Removed `bun` from `apps/backend/package.json` so pnpm will no longer install a local `bun` binary that can shadow the system runtime.
- Updated the backend dev script to use Bun in watch mode for persistence:
  - "dev": "bun --watch run index.ts"
- Ensured workspaces are discoverable by Bun (added workspaces to root package.json) and linked @repo/* packages under node_modules so tailwind/content scanning and imports work during development.
- Updated Turbo config to prefer Bun lockfile names and added a concise migration README describing the changes and developer steps.
- Updated Dockerfile(s) and added notes for CI to install Bun in images where needed (so the backend will run in Bun in CI/prod when required).

Why removing the `bun` dependency fixes it
- With no local `bun` binary present, pnpm/Turbo resolves `bun` from the system PATH and uses the correct Bun runtime you have installed (the long‑running server that `bun run index.ts` actually starts). This makes the behaviour deterministic across shells and machines (provided everyone has Bun installed).

Effects & recommended follow-ups
- Developer setup: every developer (and CI) must have the Bun runtime available (install via curl installer or use devcontainer / asdf/Volta-style tool to provision Bun). If they don't, `bun run` will fail with "command not found".
- CI / production: make sure any image or runner that executes backend code also installs Bun or runs the backend using an artifact built with Bun (e.g. `bun build --compile` or run a small Node-compatible adapter). Remove any reliance on a local npm `bun` package.
- Prevent regressions: add a small preflight check script (or a `predev` script) that exits with a clear message if `bun` is missing or the wrong version.

Quick commands (to restore a working dev environment)
- (recommended) From repo root:
  - pnpm install --frozen-lockfile
  - pnpm run dev  # runs turbo dev (backend uses system Bun)
- To ensure Bun is present for dev/CI:
  - curl -fsSL https://bun.sh/install | bash
  - bun --version

Rollbacks / reversible options
- If you want to keep the old pnpm-only flow, simply restore the original branch (we kept a `next` branch) and run:
  - git checkout next
  - pnpm install
  - pnpm run dev
- Or keep the backend on Bun but keep pnpm as workspace package manager (that’s what we now do on the `next` branch): backend is run by Bun at dev time, all workspace installs are managed by pnpm.

Final notes
- Don’t add the Bun runtime to package.json dependencies — it’s a runtime, not a package dependency. Pin Bun in documentation, CI, and developer tooling instead.
- I can add a tiny `scripts/check-bun.js` + a `predev` script to fail fast with an actionable message for devs who don’t have Bun installed. Want me to add that next?