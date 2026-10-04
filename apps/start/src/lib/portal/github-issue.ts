/** `owner/repo` and the issue number from a GitHub issue (or pull request) URL, or `null` when it is not one. */
export function parseGithubIssueUrl(issueUrl: string): { repo: string; number: number } | null {
	const match = issueUrl.match(/github\.com\/([^/]+\/[^/]+)\/(?:issues|pull)\/(\d+)/);
	if (!match?.[1] || !match[2]) return null;
	return { repo: match[1], number: Number(match[2]) };
}
