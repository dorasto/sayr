import { parseGithubPrUrl } from "@repo/util";
import type { Command } from "commander";
import pc from "picocolors";
import { ApiClientError, apiRequest } from "../../lib/client";
import { printError, printJson, pullRequestBadge } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import type { ReleasePullRequest } from "../../types";
import { fetchReleaseDetail, releasePath } from "./shared";

const PR_URL_HINT = "Expected a GitHub pull request URL such as https://github.com/owner/repo/pull/123.";

/** Rejects anything that isn't a github.com pull request URL before it reaches the network. */
function assertPullRequestUrl(url: string): void {
	if (!parseGithubPrUrl(url)) {
		throw new ApiClientError("INVALID_ARGUMENT", `Invalid pull request URL "${url}". ${PR_URL_HINT}`, 400);
	}
}

/** Same PR regardless of trailing slashes, `/files` suffixes, or owner/repo casing. */
function isSamePullRequest(a: string, b: string): boolean {
	const left = parseGithubPrUrl(a);
	const right = parseGithubPrUrl(b);
	if (!left || !right) return a === b;
	return (
		left.pr_number === right.pr_number &&
		left.pr_org.toLowerCase() === right.pr_org.toLowerCase() &&
		left.pr_repo.toLowerCase() === right.pr_repo.toLowerCase()
	);
}

export function registerReleasePrCommand(releases: Command): void {
	const pr = releases.command("pr").description("List, link, and unlink a release's GitHub pull requests");

	pr.command("list <release>")
		.description("List the pull requests linked to a release (slug or id)")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const { githubPullRequests } = await fetchReleaseDetail(orgId, release);

				if (opts.json) {
					printJson(githubPullRequests);
					return;
				}
				if (githubPullRequests.length === 0) {
					console.log(pc.dim("No pull requests linked."));
					return;
				}
				for (const linked of githubPullRequests) {
					console.log(
						`#${linked.prNumber}  ${pullRequestBadge(linked)}  ${linked.title}  ${pc.dim(linked.prUrl)}`
					);
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	pr.command("link <release> <prUrl>")
		.summary("Link a GitHub pull request to a release")
		.description(
			"Link a GitHub pull request (by URL) to a release (slug or id). The repository must be connected to the organization. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, prUrl: string, opts: { org?: string; json?: boolean }) => {
			try {
				assertPullRequestUrl(prUrl);
				const orgId = await resolveOrg(opts.org);

				const linked = await apiRequest<ReleasePullRequest>(`${releasePath(release)}/github-prs`, {
					method: "POST",
					body: { orgId, prUrl },
				});

				if (opts.json) {
					printJson(linked);
					return;
				}
				console.log(`${pc.green("✓")} Linked #${linked.prNumber} ${pc.bold(linked.title)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	pr.command("unlink <release> <prUrl>")
		.summary("Unlink a GitHub pull request from a release")
		.description(
			"Unlink a GitHub pull request (by URL) from a release (slug or id). Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, prUrl: string, opts: { org?: string; json?: boolean }) => {
			try {
				assertPullRequestUrl(prUrl);
				const orgId = await resolveOrg(opts.org);

				// The API unlinks by the link's own id, which only the release detail exposes.
				const { githubPullRequests } = await fetchReleaseDetail(orgId, release);
				const match = githubPullRequests.find((linked) => isSamePullRequest(linked.prUrl, prUrl));
				if (!match) {
					throw new ApiClientError(
						"NOT_FOUND",
						`No linked pull request matches ${prUrl}. See \`sayr releases pr list ${release}\`.`,
						404
					);
				}

				const result = await apiRequest<{ id: string }>(
					`${releasePath(release)}/github-prs/${encodeURIComponent(match.id)}`,
					{ method: "DELETE", query: { orgId } }
				);

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Unlinked #${match.prNumber} ${pc.bold(match.title)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
