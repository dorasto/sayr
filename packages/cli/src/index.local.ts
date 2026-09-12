#!/usr/bin/env node
// `sayr-local` — `sayr` with SAYR_PROFILE forced to "local", so it reads/writes
// ~/.sayr/config.local.json instead of ~/.sayr/config.json (see lib/config.ts).
// This exists as a real second entry point rather than a `process.env.SAYR_PROFILE = ...`
// line above a static `import "./index"`: ESM hoists static imports above the rest of
// a module's top-level code, so that assignment would run *after* index.ts had already
// read process.env — too late. Spawning it as a fresh child process sidesteps that
// entirely, and costs nothing a CLI invocation would notice.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [join(here, "index.js"), ...process.argv.slice(2)], {
	stdio: "inherit",
	env: { ...process.env, SAYR_PROFILE: process.env.SAYR_PROFILE || "local" },
});

process.exit(result.status ?? 1);
