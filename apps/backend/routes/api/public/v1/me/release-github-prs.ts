import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { linkGithubPrService, unlinkGithubPrService } from "../../../../../lib/releases/githubPr";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { guardReleaseRoute, invalidBody, invalidRequest, readJsonBody, releaseErrorResponse } from "./release-access";
import {
	conflictResponse,
	DeletedSchema,
	githubFailedResponse,
	invalidRequestResponse,
	orgIdBodyProperty,
	orgIdQueryParam,
	releasePathParam,
} from "./release-schemas";

export const releaseGithubPrsRoute = new Hono<AppEnv>();

const GithubPullRequestSchema = z.looseObject({
	id: z.string(),
	repositoryId: z.string(),
	organizationId: z.string(),
	releaseId: z.string().nullable(),
	prNumber: z.number(),
	prUrl: z.string(),
	title: z.string(),
	state: z.string(),
	merged: z.boolean(),
});

releaseGithubPrsRoute.post(
	"/releases/:release/github-prs",
	describeOkNotFound({
		summary: "Link Release Pull Request",
		description:
			"Link a GitHub pull request to a release by its URL. The repository must be connected to this organization; the pull request is fetched from GitHub with the organization's GitHub App installation. Linking one that's already linked here is a no-op; one linked to a different release is a 400. Returns 404 if the repository isn't connected or the pull request doesn't exist, and 502 if GitHub can't be reached. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: GithubPullRequestSchema,
		bodySchema: {
			type: "object",
			required: ["orgId", "prUrl"],
			properties: {
				orgId: orgIdBodyProperty,
				prUrl: { type: "string", description: "e.g. https://github.com/owner/repo/pull/123" },
			},
		},
		bodyExample: { orgId: "platform", prUrl: "https://github.com/dorasto/sayr/pull/123" },
		parameters: [releasePathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: {
			...bearerAuthResponses,
			...invalidRequestResponse,
			...conflictResponse,
			...githubFailedResponse,
		},
	}),
	async (c) => {
		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "content.manageReleases",
			action: "link pull requests to releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		if (typeof body.prUrl !== "string" || !body.prUrl.trim()) {
			return invalidRequest(c, '"prUrl" is required: the URL of a GitHub pull request.');
		}

		try {
			const pullRequest = await linkGithubPrService({
				orgId: guard.orgId,
				release: guard.release,
				prUrl: body.prUrl,
			});
			return c.json(successResponse(pullRequest));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.github_pr.link.failed",
				code: "GITHUB_PR_LINK_FAILED",
				message: "Failed to link GitHub PR",
				contextData: { orgId: guard.orgId, releaseId: guard.release.id },
			});
		}
	}
);

releaseGithubPrsRoute.delete(
	"/releases/:release/github-prs/:githubPRId",
	describeOkNotFound({
		summary: "Unlink Release Pull Request",
		description:
			"Unlink a pull request from a release. Use the pull request's `id` from the release's `githubPullRequests`. The pull request must be linked to this release. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: DeletedSchema,
		parameters: [
			releasePathParam,
			{
				name: "githubPRId",
				in: "path",
				required: true,
				schema: { type: "string" },
				description: "The linked pull request's id (from the release's githubPullRequests).",
			},
			orgIdQueryParam,
		],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "content.manageReleases",
			action: "unlink pull requests from releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const githubPRId = c.req.param("githubPRId");

		try {
			const unlinked = await unlinkGithubPrService({ orgId: guard.orgId, release: guard.release, githubPRId });
			if (!unlinked) {
				return c.json(
					errorResponse("Pull request not found", "No pull request with that id is linked to this release."),
					404
				);
			}
			return c.json(successResponse({ id: githubPRId }));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.github_pr.unlink.failed",
				code: "GITHUB_PR_UNLINK_FAILED",
				message: "Failed to unlink GitHub PR",
				contextData: { orgId: guard.orgId, releaseId: guard.release.id },
			});
		}
	}
);
