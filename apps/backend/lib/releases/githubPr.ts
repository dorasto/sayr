import { Octokit } from "@octokit/rest";
import { db, schema } from "@repo/database";
import { parseGithubPrUrl } from "@repo/util";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, eq } from "drizzle-orm";
import { broadcastReleasePullRequestsChanged } from "./broadcast";
import { isUniqueViolation, ReleaseServiceError } from "./errors";

/**
 * Link / unlink a GitHub pull request to a release from a PR URL, for
 * `/v1/me`. The web app links from a picker that already has the PR's data;
 * here the caller only has a URL, so the PR is looked up on GitHub with the
 * organization's own GitHub App installation (never a user credential) and
 * stored the same way the web link does.
 *
 * Every step stays inside the organization: the repository must be one this
 * org connected, and a PR row that belongs to another org is treated as
 * not found rather than reused or overwritten.
 */

function isNotFound(err: unknown): boolean {
	return typeof err === "object" && err !== null && "status" in err && err.status === 404;
}

function notConnected(owner: string, repo: string) {
	return new ReleaseServiceError(
		"REPOSITORY_NOT_CONNECTED",
		`The repository ${owner}/${repo} isn't connected to this organization.`
	);
}

/**
 * Finds the connected repository (and an authenticated client for it) that
 * really is `owner/repo`. The stored row only has the repo's name, so several
 * connected repositories can share it under different owners — each candidate's
 * owner is verified against GitHub (`GET /repositories/{id}`, the same call
 * `updateTaskService` makes) rather than trusting the URL.
 */
async function findConnectedRepository(orgId: string, owner: string, repo: string) {
	const enabled = await db.query.githubRepository.findMany({
		where: and(eq(schema.githubRepository.organizationId, orgId), eq(schema.githubRepository.enabled, true)),
	});
	const candidates = enabled.filter((row) => row.repoName.toLowerCase() === repo.toLowerCase());
	if (candidates.length === 0) throw notConnected(owner, repo);

	const tokens = new Map<number, string>();
	let githubFailed = false;

	for (const repository of candidates) {
		try {
			let token = tokens.get(repository.installationId);
			if (!token) {
				token = await getInstallationToken(repository.installationId);
				tokens.set(repository.installationId, token);
			}

			const octokit = new Octokit({ auth: token });
			const { data } = await octokit.request("GET /repositories/{repository_id}", {
				repository_id: repository.repoId,
			});

			if (data.owner.login.toLowerCase() === owner.toLowerCase()) {
				return { repository, octokit, owner: data.owner.login, name: data.name };
			}
		} catch (err) {
			console.error("Failed to verify GitHub repository for release PR link", { orgId, repo, error: err });
			githubFailed = true;
		}
	}

	// A candidate we couldn't check might have been the match, so don't claim "not connected".
	if (githubFailed) {
		throw new ReleaseServiceError(
			"GITHUB_REQUEST_FAILED",
			"Couldn't verify the repository with GitHub. Try again shortly."
		);
	}
	throw notConnected(owner, repo);
}

export async function linkGithubPrService(params: {
	orgId: string;
	release: schema.releaseType;
	prUrl: string;
}): Promise<schema.githubPullRequestType> {
	const { orgId, release, prUrl } = params;

	const parsed = parseGithubPrUrl(prUrl.trim());
	if (!parsed) {
		throw new ReleaseServiceError(
			"INVALID_PR_URL",
			"Pass a GitHub pull request URL, like https://github.com/owner/repo/pull/123."
		);
	}

	const { repository, octokit, owner, name } = await findConnectedRepository(orgId, parsed.pr_org, parsed.pr_repo);

	let pull: Awaited<ReturnType<typeof octokit.rest.pulls.get>>["data"];
	try {
		({ data: pull } = await octokit.rest.pulls.get({ owner, repo: name, pull_number: parsed.pr_number }));
	} catch (err) {
		if (isNotFound(err)) {
			throw new ReleaseServiceError(
				"PR_NOT_FOUND",
				`Pull request #${parsed.pr_number} wasn't found in ${owner}/${name}.`
			);
		}
		console.error("Failed to fetch GitHub pull request for release PR link", { orgId, error: err });
		throw new ReleaseServiceError(
			"GITHUB_REQUEST_FAILED",
			"Couldn't fetch the pull request from GitHub. Try again shortly."
		);
	}

	const notFound = () =>
		new ReleaseServiceError("PR_NOT_FOUND", `Pull request #${parsed.pr_number} wasn't found in ${owner}/${name}.`);

	const findExisting = () =>
		db.query.githubPullRequest.findFirst({
			where: and(
				eq(schema.githubPullRequest.repositoryId, repository.id),
				eq(schema.githubPullRequest.prNumber, pull.number)
			),
		});

	// A stored row for this pull request can be linked only if it's this organization's
	// and isn't already linked to a different release.
	const assertLinkable = (row: schema.githubPullRequestType) => {
		// A row owned by another organization is never reused or overwritten.
		if (row.organizationId !== orgId) throw notFound();
		if (row.releaseId && row.releaseId !== release.id) {
			throw new ReleaseServiceError(
				"PR_ALREADY_LINKED",
				"This pull request is already linked to a different release. Unlink it from that release first."
			);
		}
	};

	// Same fields, same "draft" convention, as the GitHub webhook worker stores.
	const fields = {
		prUrl: pull.html_url,
		title: pull.title,
		headSha: pull.head.sha,
		headBranch: pull.head.ref,
		baseBranch: pull.base.ref,
		state: pull.draft ? "draft" : pull.state,
		merged: pull.merged,
		mergeCommitSha: pull.merge_commit_sha,
	};

	const relink = async (row: schema.githubPullRequestType) => {
		const [updated] = await db
			.update(schema.githubPullRequest)
			.set({ ...fields, releaseId: release.id, updatedAt: new Date() })
			.where(and(eq(schema.githubPullRequest.id, row.id), eq(schema.githubPullRequest.organizationId, orgId)))
			.returning();
		return updated;
	};

	const existing = await findExisting();
	if (existing) assertLinkable(existing);

	let linked: schema.githubPullRequestType | undefined;
	if (existing) {
		linked = await relink(existing);
	} else {
		try {
			[linked] = await db
				.insert(schema.githubPullRequest)
				.values({
					...fields,
					repositoryId: repository.id,
					organizationId: orgId,
					prNumber: pull.number,
					body: null,
					releaseId: release.id,
				})
				.returning();
		} catch (err) {
			if (!isUniqueViolation(err)) throw err;

			// The row appeared between the lookup and the insert (the GitHub webhook worker
			// stores pull requests too, and two links can race). Read it back and apply the
			// same checks as if it had been there from the start.
			const raced = await findExisting();
			if (!raced) {
				throw new ReleaseServiceError(
					"CONFLICT",
					"This pull request changed while it was being linked. Try again."
				);
			}
			assertLinkable(raced);
			linked = await relink(raced);
		}
	}

	if (!linked) throw notFound();

	broadcastReleasePullRequestsChanged(orgId, release.id);
	return linked;
}

/**
 * Unlinks a pull request from the release (the PR row itself is kept — it may
 * also be linked to a task). Returns `false` when no PR with that id is linked
 * to THIS release in THIS organization.
 */
export async function unlinkGithubPrService(params: {
	orgId: string;
	release: schema.releaseType;
	githubPRId: string;
}): Promise<boolean> {
	const { orgId, release, githubPRId } = params;

	const unlinked = await db
		.update(schema.githubPullRequest)
		.set({ releaseId: null, updatedAt: new Date() })
		.where(
			and(
				eq(schema.githubPullRequest.id, githubPRId),
				eq(schema.githubPullRequest.organizationId, orgId),
				eq(schema.githubPullRequest.releaseId, release.id)
			)
		)
		.returning({ id: schema.githubPullRequest.id });

	if (unlinked.length === 0) return false;

	broadcastReleasePullRequestsChanged(orgId, release.id);
	return true;
}
