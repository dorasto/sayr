import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: that config's plugin chain
// (tanstackStart, nitro, posthog) does SSR/router codegen meant for a real
// build, not a test runner context, so vitest gets its own minimal config
// instead of inheriting it.
export default defineConfig({
	test: {
		// This app has no test files yet — passWithNoTests keeps `pnpm test`
		// green in the meantime instead of failing CI on "zero tests" as if it
		// were a real break. Remove once real tests exist here.
		passWithNoTests: true,
	},
});
