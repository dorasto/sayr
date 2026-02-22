import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

export interface GitContributor {
	name: string;
	email: string;
	github?: string;
	commits: number;
	avatar_url?: string;
	profile_url?: string;
}

export interface PageContributors {
	author?: GitContributor;
	contributors: GitContributor[];
}

interface ContributorData {
	[filePath: string]: PageContributors;
}

// Load pre-computed contributor data at module initialization.
// This middleware runs at build time during prerendering (pages are static HTML),
// so we read from src/data/contributors.json which is written by the
// precomputeContributors integration in the astro:build:start hook
// (before pages are prerendered).
// We use process.cwd() because during both dev and build, Astro sets
// the cwd to the marketing app root.
//
// Keys are normalised to lowercase because Starlight's entry.id uses
// github-slugger which lowercases path segments, while the JSON keys
// preserve the original filesystem casing.
let contributorData: ContributorData = {};

try {
	const dataPath = resolve(process.cwd(), "src/data/contributors.json");

	if (existsSync(dataPath)) {
		const rawData = readFileSync(dataPath, "utf-8");
		const raw: ContributorData = JSON.parse(rawData);
		// Normalise keys to lowercase for case-insensitive lookup
		for (const [key, value] of Object.entries(raw)) {
			contributorData[key.toLowerCase()] = value;
		}
		console.log(`[contributors] Loaded ${Object.keys(contributorData).length} entries from ${dataPath}`);
	} else {
		console.warn("[contributors] No pre-computed contributor data found at", dataPath);
	}
} catch (error) {
	console.error("[contributors] Failed to load pre-computed contributor data:", error);
}

/**
 * Route middleware that adds Git contributors to route data
 * Uses pre-computed data instead of running git commands at runtime
 */
export const onRequest = defineRouteMiddleware((context) => {
	const { starlightRoute } = context.locals;

	// Get the content file path from the entry
	const entry = starlightRoute.entry;
	if (!entry) {
		return;
	}

	// The entry.id is the slug relative to the content directory WITHOUT extension.
	// Starlight uses github-slugger which lowercases path segments, so the lookup
	// must also be lowercase to match our normalised keys.
	const baseContentPath = `src/content/docs/${entry.id}`.toLowerCase();

	// Try common extensions to find the matching pre-computed data.
	// Starlight strips trailing "/index" from slugs (e.g. docs/knowledge-base/index.md
	// becomes entry.id "docs/knowledge-base"), so we also check for index files.
	const extensions = [".md", ".mdx"];
	const candidates = [baseContentPath];
	// Also try as a directory with an index file
	candidates.push(`${baseContentPath}/index`);

	let pageContributors: PageContributors | undefined;

	for (const candidate of candidates) {
		for (const ext of extensions) {
			const testPath = candidate + ext;
			if (contributorData[testPath]) {
				pageContributors = contributorData[testPath];
				break;
			}
		}
		if (pageContributors) break;
	}

	if (!pageContributors) {
		return;
	}

	// Attach to route data for use in components
	(starlightRoute as any).pageContributors = pageContributors;
});
