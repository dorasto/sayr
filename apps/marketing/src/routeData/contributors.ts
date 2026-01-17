import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export interface GitContributor {
	name: string;
	email: string;
	github?: string;
	commits: number;
}

export interface PageContributors {
	author?: GitContributor;
	contributors: GitContributor[];
}

// Cache to avoid repeated git calls for the same file
const contributorCache = new Map<string, PageContributors>();

/**
 * Extract GitHub username from email if it's a GitHub noreply email
 * Format: username@users.noreply.github.com or 12345678+username@users.noreply.github.com
 */
function extractGitHubFromEmail(email: string): string | undefined {
	const noreplyMatch = email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/);
	if (noreplyMatch) {
		return noreplyMatch[1];
	}
	return undefined;
}

/**
 * Get contributors for a file from Git history
 */
function getFileContributors(filePath: string): PageContributors {
	// Check cache first
	if (contributorCache.has(filePath)) {
		return contributorCache.get(filePath)!;
	}

	try {
		// Get the root directory of the marketing app
		const __dirname = dirname(fileURLToPath(import.meta.url));
		// Go up two levels: routeData -> src -> marketing root
		const marketingRoot = resolve(__dirname, "../..");
		const absolutePath = resolve(marketingRoot, filePath);

		// Get all commits for this file with author info (newest first by default)
		// Format: name<TAB>email
		const gitLog = execSync(
			`git log --follow --format="%aN\t%aE" -- "${absolutePath}"`,
			{
				cwd: marketingRoot,
				encoding: "utf-8",
				timeout: 5000,
			}
		);

		const lines = gitLog.trim().split("\n").filter(Boolean);

		if (lines.length === 0) {
			const result: PageContributors = { contributors: [] };
			contributorCache.set(filePath, result);
			return result;
		}

		// The last line is the oldest commit (original author)
		const originalAuthorLine = lines[lines.length - 1];
		const [originalName, originalEmail] = originalAuthorLine.split("\t");

		// Count commits per author for contributors (excluding original author)
		const authorCommits = new Map<string, { name: string; email: string; commits: number }>();

		for (const line of lines) {
			const [name, email] = line.split("\t");
			if (!name || !email) continue;

			const key = email.toLowerCase();
			
			// Skip the original author - they go in the "author" field
			if (key === originalEmail.toLowerCase()) continue;

			const existing = authorCommits.get(key);

			if (existing) {
				existing.commits++;
			} else {
				authorCommits.set(key, { name, email, commits: 1 });
			}
		}

		// Convert to array and sort by commits (most commits first)
		const contributors = Array.from(authorCommits.values())
			.sort((a, b) => b.commits - a.commits)
			.map((author) => ({
				...author,
				github: extractGitHubFromEmail(author.email),
			}));

		// Original author (first commit) is the primary author
		const author: GitContributor = {
			name: originalName,
			email: originalEmail,
			commits: lines.filter((l) => l.split("\t")[1]?.toLowerCase() === originalEmail.toLowerCase()).length,
			github: extractGitHubFromEmail(originalEmail),
		};

		const result: PageContributors = {
			author,
			contributors,
		};

		contributorCache.set(filePath, result);
		return result;
	} catch (error) {
		// Git command failed (maybe not a git repo, or file not tracked)
		console.warn(`Failed to get git contributors for ${filePath}:`, error);
		const result: PageContributors = { contributors: [] };
		contributorCache.set(filePath, result);
		return result;
	}
}

/**
 * Route middleware that adds Git contributors to route data
 */
export const onRequest = defineRouteMiddleware((context) => {
	const { starlightRoute } = context.locals;

	console.log("[contributors] Route middleware called for:", starlightRoute.slug);

	// Get the content file path from the entry
	const entry = starlightRoute.entry;
	if (!entry) {
		console.log("[contributors] No entry found, skipping");
		return;
	}

	// The entry.id is the path relative to the content directory WITHOUT extension
	// e.g., "docs/quick-start" - we need to find the actual file
	const __dirname = dirname(fileURLToPath(import.meta.url));
	// Go up two levels: routeData -> src -> marketing root
	const marketingRoot = resolve(__dirname, "../..");
	const baseContentPath = `src/content/docs/${entry.id}`;
	
	console.log("[contributors] __dirname:", __dirname);
	console.log("[contributors] marketingRoot:", marketingRoot);
	console.log("[contributors] entry.id:", entry.id);
	
	// Try common extensions
	const extensions = [".md", ".mdx"];
	let contentPath: string | null = null;
	
	for (const ext of extensions) {
		const testPath = baseContentPath + ext;
		const absoluteTestPath = resolve(marketingRoot, testPath);
		console.log("[contributors] Testing path:", absoluteTestPath, "exists:", existsSync(absoluteTestPath));
		if (existsSync(absoluteTestPath)) {
			contentPath = testPath;
			break;
		}
	}
	
	if (!contentPath) {
		console.log("[contributors] Could not find file for:", baseContentPath);
		return;
	}
	
	console.log("[contributors] Looking for file:", contentPath);

	// Fetch contributors from Git
	const pageContributors = getFileContributors(contentPath);
	console.log("[contributors] Found contributors:", JSON.stringify(pageContributors));

	// Attach to route data for use in components
	// We'll use a custom property on starlightRoute
	(starlightRoute as any).pageContributors = pageContributors;
});
