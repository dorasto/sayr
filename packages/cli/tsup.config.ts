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
	// This is also why @repo/util lives under devDependencies, not dependencies,
	// in package.json: it's fully inlined here, so consumers of the published
	// package never need to resolve it. Keep it that way — a published tarball
	// with "@repo/util": "workspace:*" under dependencies breaks `npm i` for
	// everyone (npm has no idea what the workspace: protocol means), which is
	// exactly what shipped in 0.1.0 after publish-cli.yml checked out a stale
	// pre-fix commit via the default pull_request merge ref.
	noExternal: ["@repo/util"],
});
