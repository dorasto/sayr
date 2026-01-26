/**
 * Astro integration that pre-computes Git contributor data at build time
 * and makes it available to the application without requiring .git at runtime.
 */
import type { AstroIntegration } from "astro";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { glob } from "glob";

/**
 * Manual mapping of email addresses to GitHub usernames
 * Add custom emails here that don't use GitHub's noreply format
 */
const EMAIL_TO_GITHUB: Record<string, string> = {
	"tommerty@doras.to": "tommerty",
	"trent@doras.to": "trent-001",
	// Add more mappings as needed
};

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

export interface ContributorData {
	[filePath: string]: PageContributors;
}

/**
 * Extract GitHub username from email if it's a GitHub noreply email or in the manual mapping
 */
function extractGitHubFromEmail(email: string): string | undefined {
	// Check manual mapping first
	const mappedUsername = EMAIL_TO_GITHUB[email.toLowerCase()];
	if (mappedUsername) {
		return mappedUsername;
	}

	// Try to extract from GitHub noreply email
	const noreplyMatch = email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/);
	if (noreplyMatch) {
		return noreplyMatch[1];
	}
	
	return undefined;
}

/**
 * Cache for GitHub user data to avoid rate limits
 */
const githubUserCache = new Map<string, { avatar_url: string; profile_url: string }>();

/**
 * Fetch GitHub user data (avatar, profile URL) from GitHub API
 */
async function fetchGitHubUserData(
	username: string,
): Promise<{ avatar_url: string; profile_url: string } | null> {
	// Check cache first
	if (githubUserCache.has(username)) {
		return githubUserCache.get(username)!;
	}

	try {
		const response = await fetch(`https://api.github.com/users/${username}`, {
			headers: {
				Accept: "application/vnd.github.v3+json",
				// Use GITHUB_TOKEN if available to avoid rate limits
				...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
			},
		});

		if (!response.ok) {
			console.warn(`[precompute-contributors] Failed to fetch GitHub user ${username}: ${response.status}`);
			return null;
		}

		const data = await response.json();
		const userData = {
			avatar_url: data.avatar_url,
			profile_url: data.html_url,
		};

		// Cache the result
		githubUserCache.set(username, userData);
		return userData;
	} catch (error) {
		console.warn(`[precompute-contributors] Error fetching GitHub user ${username}:`, error);
		return null;
	}
}

/**
 * Get contributors for a file from Git history
 */
async function getFileContributors(filePath: string, cwd: string): Promise<PageContributors> {
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
	const originalAuthorGithub = extractGitHubFromEmail(originalEmail);

	// Count commits per author for contributors (excluding original author)
	// Group by GitHub username if available, otherwise by email
	const authorCommits = new Map<
		string,
		{ name: string; email: string; commits: number; github?: string }
	>();

	for (const line of lines) {
		const [name, email] = line.split("\t");
		if (!name || !email) continue;

		const github = extractGitHubFromEmail(email);
		const emailLower = email.toLowerCase();

		// Skip the original author - they go in the "author" field
		// Check both email and GitHub username to handle different commit methods
		if (
			emailLower === originalEmail.toLowerCase() ||
			(github && originalAuthorGithub && github === originalAuthorGithub)
		) {
			continue;
		}

		// Use GitHub username as key if available, otherwise use email
		// This deduplicates contributors who commit with different emails but same GitHub account
		const key = github || emailLower;

		const existing = authorCommits.get(key);

		if (existing) {
			existing.commits++;
			// Prefer the most recent name (first occurrence in reverse chronological order)
			// and prefer GitHub noreply email if we have it
			if (!existing.github && github) {
				existing.github = github;
				existing.email = email;
				existing.name = name;
			}
		} else {
			authorCommits.set(key, { name, email, commits: 1, github });
		}
	}

	// Convert to array and sort by commits (most commits first)
	// Fetch GitHub data for contributors
	const contributorsWithGitHub = await Promise.all(
		Array.from(authorCommits.values())
			.sort((a, b) => b.commits - a.commits)
			.map(async (author) => {
				const { github } = author;
				let avatar_url: string | undefined;
				let profile_url: string | undefined;

				if (github) {
					const githubData = await fetchGitHubUserData(github);
					if (githubData) {
						avatar_url = githubData.avatar_url;
						profile_url = githubData.profile_url;
					}
				}

				return {
					name: author.name,
					email: author.email,
					commits: author.commits,
					github,
					avatar_url,
					profile_url,
				};
			}),
	);

		// Original author (first commit) is the primary author
		const authorGithub = extractGitHubFromEmail(originalEmail);
		let authorAvatarUrl: string | undefined;
		let authorProfileUrl: string | undefined;

		if (authorGithub) {
			const githubData = await fetchGitHubUserData(authorGithub);
			if (githubData) {
				authorAvatarUrl = githubData.avatar_url;
				authorProfileUrl = githubData.profile_url;
			}
		}

		const author: GitContributor = {
			name: originalName,
			email: originalEmail,
			commits: lines.filter((l) => l.split("\t")[1]?.toLowerCase() === originalEmail.toLowerCase()).length,
			github: authorGithub,
			avatar_url: authorAvatarUrl,
			profile_url: authorProfileUrl,
		};

		return {
			author,
			contributors: contributorsWithGitHub,
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
			const dataDir = resolve(cwd, "src/data");
			const outputPath = resolve(dataDir, "contributors.json");
			contributorData = {};

			// Check if we're in a git repository
			let hasGit = false;
			try {
				execSync("git rev-parse --git-dir", { cwd, stdio: "pipe" });
				hasGit = true;
			} catch {
				logger.warn("Not in a git repository");
			}

			// If no Git, check if we have a committed contributors.json
			if (!hasGit) {
				if (existsSync(outputPath)) {
					logger.info("Using existing contributors.json (no Git repository available)");
					return; // Don't overwrite existing file
				} else {
					logger.warn("No Git repository and no existing contributors.json found");
					logger.warn("Creating empty contributors.json");
					// Create empty contributors.json file
					if (!existsSync(dataDir)) {
						mkdirSync(dataDir, { recursive: true });
					}
					writeFileSync(outputPath, JSON.stringify({}, null, 2));
					return;
				}
			}

			// Git is available, generate fresh contributor data
			logger.info("Git repository detected, generating contributor data...");

			// Find all markdown/mdx files in content/docs
			const contentDir = resolve(cwd, "src/content/docs");
			const files = glob.sync("**/*.{md,mdx}", {
				cwd: contentDir,
				absolute: false,
			});

		logger.info(`Found ${files.length} documentation files`);

		for (const file of files) {
			const relativePath = `src/content/docs/${file}`;
			const contributors = await getFileContributors(relativePath, cwd);

			if (contributors.author || contributors.contributors.length > 0) {
				contributorData[relativePath] = contributors;
				logger.info(
					`  ${file}: ${contributors.author?.name || "no author"}, ${contributors.contributors.length} contributors`,
				);
			}
		}

			// Write the pre-computed data to a JSON file in src/data
			// Ensure the directory exists
			if (!existsSync(dataDir)) {
				mkdirSync(dataDir, { recursive: true });
			}
			
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
