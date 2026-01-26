/**
 * Astro integration that pre-computes Git contributor data at build time
 * and makes it available to the application without requiring .git at runtime.
 */
import type { AstroIntegration } from "astro";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { glob } from "glob";

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

export interface ContributorData {
	[filePath: string]: PageContributors;
}

/**
 * Extract GitHub username from email if it's a GitHub noreply email
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
function getFileContributors(filePath: string, cwd: string): PageContributors {
	try {
		const absolutePath = resolve(cwd, filePath);

		// Check if git repo exists
		try {
			execSync("git rev-parse --git-dir", { cwd, stdio: "pipe" });
		} catch {
			console.warn("[precompute-contributors] Not in a git repository, skipping");
			return { contributors: [] };
		}

		// Get all commits for this file with author info (newest first by default)
		const gitLog = execSync(`git log --follow --format="%aN\t%aE" -- "${absolutePath}"`, {
			cwd,
			encoding: "utf-8",
			timeout: 5000,
		});

		const lines = gitLog.trim().split("\n").filter(Boolean);

		if (lines.length === 0) {
			return { contributors: [] };
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

		return {
			author,
			contributors,
		};
	} catch (error) {
		console.warn(`[precompute-contributors] Failed to get git contributors for ${filePath}:`, error);
		return { contributors: [] };
	}
}

export function precomputeContributors(): AstroIntegration {
	let contributorData: ContributorData = {};

	return {
		name: "precompute-contributors",
		hooks: {
			"astro:config:setup": ({ injectRoute }) => {
				// Inject a virtual module that provides the contributor data
				// This makes it available at runtime without file system access
			},
			"astro:build:start": async ({ logger }) => {
				logger.info("Pre-computing Git contributor data...");

				const cwd = process.cwd();
				contributorData = {};

				// Find all markdown/mdx files in content/docs
				const contentDir = resolve(cwd, "src/content/docs");
				const files = glob.sync("**/*.{md,mdx}", {
					cwd: contentDir,
					absolute: false,
				});

				logger.info(`Found ${files.length} documentation files`);

				for (const file of files) {
					const relativePath = `src/content/docs/${file}`;
					const contributors = getFileContributors(relativePath, cwd);

					if (contributors.author || contributors.contributors.length > 0) {
						contributorData[relativePath] = contributors;
						logger.info(
							`  ${file}: ${contributors.author?.name || "no author"}, ${contributors.contributors.length} contributors`,
						);
					}
				}

				// Write the pre-computed data to a JSON file in src/data
				const outputPath = resolve(cwd, "src/data/contributors.json");
				writeFileSync(outputPath, JSON.stringify(contributorData, null, 2));

				logger.info(`Wrote contributor data to ${outputPath}`);
			},
			"astro:build:done": async ({ dir, logger }) => {
				// Copy the contributors.json to the dist folder for runtime access
				const srcPath = resolve(process.cwd(), "src/data/contributors.json");
				
				// dir.pathname points to dist/client, but we need to go up to dist
				const distRoot = resolve(dir.pathname, "..");
				
				// Copy to both client and server dist folders
				const clientDestPath = resolve(distRoot, "client/data/contributors.json");
				const serverDestPath = resolve(distRoot, "server/data/contributors.json");

				// Create the data directories
				const clientDestDir = resolve(distRoot, "client/data");
				const serverDestDir = resolve(distRoot, "server/data");
				
				if (!existsSync(clientDestDir)) {
					mkdirSync(clientDestDir, { recursive: true });
				}
				if (!existsSync(serverDestDir)) {
					mkdirSync(serverDestDir, { recursive: true });
				}

				// Copy the file to both locations
				copyFileSync(srcPath, clientDestPath);
				copyFileSync(srcPath, serverDestPath);

				logger.info(`Copied contributor data to ${clientDestPath} and ${serverDestPath}`);
			},
		},
	};
}
