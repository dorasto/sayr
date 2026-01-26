import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

// Load pre-computed contributor data at module initialization
let contributorData: ContributorData = {};

try {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	
	// In development: load from src/data
	// In production: load from dist/server/data (same level as chunks folder)
	let dataPath: string;
	
	if (import.meta.env.DEV) {
		const marketingRoot = resolve(__dirname, "../..");
		dataPath = resolve(marketingRoot, "src/data/contributors.json");
	} else {
		// In production, this middleware is in dist/server/chunks/routeData or similar
		// The data file is in dist/server/data/contributors.json
		// Walk up until we find the server folder, then go to data
		let currentDir = __dirname;
		while (currentDir && !currentDir.endsWith("/server") && currentDir !== "/") {
			currentDir = resolve(currentDir, "..");
		}
		dataPath = resolve(currentDir, "data/contributors.json");
	}

	if (existsSync(dataPath)) {
		const rawData = readFileSync(dataPath, "utf-8");
		contributorData = JSON.parse(rawData);
		console.log(`[contributors] Loaded ${Object.keys(contributorData).length} entries from ${import.meta.env.DEV ? 'src/data' : 'dist/server/data'}`);
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

	// The entry.id is the path relative to the content directory WITHOUT extension
	const baseContentPath = `src/content/docs/${entry.id}`;

	// Try common extensions to find the matching pre-computed data
	const extensions = [".md", ".mdx"];
	let pageContributors: PageContributors | undefined;

	for (const ext of extensions) {
		const testPath = baseContentPath + ext;

		if (contributorData[testPath]) {
			pageContributors = contributorData[testPath];
			break;
		}
	}

	if (!pageContributors) {
		return;
	}

	// Attach to route data for use in components
	(starlightRoute as any).pageContributors = pageContributors;
});
