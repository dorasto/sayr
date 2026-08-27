import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "node",
	target: "node18",
	dts: false,
	sourcemap: true,
	clean: true,
	outDir: "dist",
	// @repo/util ships raw TS source (no build step of its own) — bundle it in
	// rather than leaving it as an external import Node can't resolve at runtime.
	noExternal: ["@repo/util"],
});
