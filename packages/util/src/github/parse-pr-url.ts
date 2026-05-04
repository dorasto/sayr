export interface ParsedGithubPrUrl {
	pr_org: string;
	pr_repo: string;
	pr_number: number;
	pr_url: string;
}

export function parseGithubPrUrl(url: string): ParsedGithubPrUrl | null {
	if (!url) return null;

	try {
		const parsed = new URL(url);

		if (parsed.hostname !== "github.com") {
			return null;
		}

		const pathParts = parsed.pathname.split("/").filter(Boolean);

		if (pathParts.length < 4 || pathParts[2] !== "pull") {
			return null;
		}

		const pr_org = pathParts[0];
		const pr_repo = pathParts[1];
		const pr_number = parseInt(pathParts[3], 10);

		if (isNaN(pr_number) || pr_number <= 0) {
			return null;
		}

		return {
			pr_org,
			pr_repo,
			pr_number,
			pr_url: url,
		};
	} catch {
		return null;
	}
}
