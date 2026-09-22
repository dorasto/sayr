import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: that config's plugin chain
// (tanstackStart, nitro, posthog) does SSR/router codegen meant for a real
// build, not a test runner context, so vitest gets its own minimal config
// instead of inheriting it.
//
// No `@/` alias here: tests cover pure modules (see src/lib/board/), which may
// only `import type` from `@/…` — type imports are erased before resolution.
export default defineConfig({
	test: {},
});
