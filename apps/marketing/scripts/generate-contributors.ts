#!/usr/bin/env node
/**
 * Standalone script to regenerate contributors.json.
 *
 * Usage:
 *   pnpm -F marketing contributors
 *
 * This calls the same generateContributorData() function used by the Astro
 * integration, so the output is identical to what gets produced during
 * `astro build` or `astro dev`.
 */
import { generateContributorData } from "../src/integrations/precompute-contributors.ts";

const logger = {
	info: (msg: string) => console.log(`[contributors] ${msg}`),
	warn: (msg: string) => console.warn(`[contributors] ${msg}`),
};

const cwd = process.cwd();
console.log(`[contributors] Generating contributor data from ${cwd}...`);

const data = await generateContributorData(cwd, logger);

if (data) {
	console.log(`[contributors] Done — ${Object.keys(data).length} pages processed.`);
} else {
	console.log("[contributors] Skipped (no git or existing file used as-is).");
}
