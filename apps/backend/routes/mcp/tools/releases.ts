import { getRelease, getReleases, type schema } from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import type { ApiKeyScope } from "@repo/util";
import { z } from "zod";
import { resolveReleaseId } from "../../../lib/apiRefs";
import { assertMcpAccess } from "../../../lib/mcp/auth";
import { loadReleaseDetail } from "../../../lib/releases/detail";
import { ReleaseServiceError } from "../../../lib/releases/errors";
import { parseCreateReleaseInput, parseUpdateReleaseInput, RELEASE_STATUSES } from "../../../lib/releases/input";
import {
	createReleaseService,
	deleteReleaseService,
	markReleasedService,
	updateReleaseService,
} from "../../../lib/releases/lifecycle";
import { type McpUserClaims, resolveAndRateLimitOrg, toolError, toolJson } from "../context";

export const orgArg = z.string().describe('Organization slug (e.g. "platform") or id.');
export const releaseArg = z.string().describe('Release slug (e.g. "v1.2.0") or id.');

function releaseSummary(release: schema.releaseType) {
	return {
		id: release.id,
		name: release.name,
		slug: release.slug,
		status: release.status,
		targetDate: release.targetDate,
		releasedAt: release.releasedAt,
		color: release.color,
		icon: release.icon,
		leadId: release.leadId,
	};
}

export function releaseFailure(err: unknown, fallback: string) {
	if (err instanceof ReleaseServiceError) return toolError(`${err.title}: ${err.message}`);
	return toolError(fallback);
}

/** Org lookup, rate limit, scope + team permission, then the release — so a caller who isn't allowed never learns whether a release exists. */
export async function guard(
	claims: McpUserClaims,
	org: string,
	scope: ApiKeyScope,
	action: string
): Promise<{ error: ReturnType<typeof toolError> } | { orgId: string }> {
	const resolved = await resolveAndRateLimitOrg(claims.userId, org);
	if ("error" in resolved) return { error: toolError(resolved.error) };

	const allowed = await assertMcpAccess(claims.userId, resolved.orgId, claims.scopes, scope);
	if (!allowed) {
		return {
			error: toolError(
				`You don't have permission to ${action} here — the token is missing the ${scope} scope, or your role in this organization doesn't allow it.`
			),
		};
	}
	return { orgId: resolved.orgId };
}

export async function findRelease(orgId: string, ref: string) {
	const releaseId = await resolveReleaseId(orgId, ref);
	const release = releaseId ? await getRelease(releaseId) : null;
	return release && release.organizationId === orgId ? release : null;
}

export function registerReleaseTools(server: McpServer, claims: McpUserClaims | null) {
	server.registerTool(
		"list_releases",
		{
			title: "List releases",
			description: "List an organization's releases, optionally filtered by status.",
			inputSchema: z.object({
				org: orgArg,
				status: z.enum(RELEASE_STATUSES).optional().describe("Only return releases in this status."),
			}),
		},
		async ({ org, status }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.read", "read releases");
			if ("error" in g) return g.error;

			const releases = await getReleases(g.orgId, status);
			return toolJson(releases.map(releaseSummary));
		}
	);

	server.registerTool(
		"get_release",
		{
			title: "Get release",
			description:
				"Get one release: details, Markdown description, creator and lead, labels, linked GitHub pull requests, its tasks, and task counts.",
			inputSchema: z.object({ org: orgArg, release: releaseArg }),
		},
		async ({ org, release: releaseRef }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.read", "read releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const { descriptionMarkdown, ...detail } = await loadReleaseDetail(release);
			return toolJson({ ...detail, description: descriptionMarkdown });
		}
	);

	server.registerTool(
		"create_release",
		{
			title: "Create release",
			description:
				'Create a release. The slug defaults to one generated from the name, which turns everything but letters and numbers into "-" — pass a slug (e.g. "v1.2.0") to keep dots.',
			inputSchema: z.object({
				org: orgArg,
				name: z.string().min(1),
				slug: z.string().optional().describe("Unique in the organization."),
				description: z.string().optional().describe("Markdown."),
				status: z.enum(RELEASE_STATUSES).optional().describe('Default "planned".'),
				targetDate: z.string().optional().describe("ISO date, e.g. 2026-10-01."),
				releasedAt: z.string().optional().describe('ISO date. Defaults to now when status is "released".'),
				color: z.string().optional().describe("Hex (#3B82F6) or hsla(217, 91%, 60%, 1). Defaults to blue."),
				icon: z.string().optional().describe('Icon name. Default "IconRocket".'),
				leadId: z.string().optional().describe("User id of an organization member (see list_members)."),
			}),
		},
		async ({ org, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "create releases");
			if ("error" in g) return g.error;

			const input = parseCreateReleaseInput(fields);
			if (!input.ok) return toolError(input.error);

			try {
				const release = await createReleaseService({
					orgId: g.orgId,
					actorUserId: claims.userId,
					input: input.value,
				});
				return toolJson(releaseSummary(release));
			} catch (err) {
				return releaseFailure(err, "Failed to create release.");
			}
		}
	);

	server.registerTool(
		"update_release",
		{
			title: "Update release",
			description:
				'Update a release; only the fields you pass change. Setting status "released" here does NOT close the release\'s tasks — use publish_release for that.',
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				name: z.string().optional(),
				slug: z.string().optional().describe("Unique in the organization."),
				description: z.string().optional().describe("Markdown. Pass an empty string to clear it."),
				status: z.enum(RELEASE_STATUSES).optional(),
				targetDate: z.string().nullable().optional().describe("ISO date, or null to clear."),
				releasedAt: z.string().nullable().optional().describe("ISO date, or null to clear."),
				color: z.string().optional().describe("Hex (#3B82F6) or hsla(217, 91%, 60%, 1)."),
				icon: z.string().optional(),
				leadId: z
					.string()
					.nullable()
					.optional()
					.describe("User id of an organization member (see list_members), or null to clear."),
			}),
		},
		async ({ org, release: releaseRef, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "update releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const input = parseUpdateReleaseInput(fields);
			if (!input.ok) return toolError(input.error);

			try {
				const updated = await updateReleaseService({ orgId: g.orgId, release, input: input.value });
				return toolJson(releaseSummary(updated));
			} catch (err) {
				return releaseFailure(err, "Failed to update release.");
			}
		}
	);

	server.registerTool(
		"publish_release",
		{
			title: "Publish release",
			description:
				"Mark a release as released and close every task in it that isn't already done or canceled. Safe to repeat.",
			inputSchema: z.object({ org: orgArg, release: releaseArg }),
		},
		async ({ org, release: releaseRef }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "publish releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			try {
				const result = await markReleasedService({ orgId: g.orgId, release, actorUserId: claims.userId });
				return toolJson({
					release: releaseSummary(result.release),
					updatedTaskCount: result.updatedTaskCount,
					alreadyReleased: result.alreadyReleased,
				});
			} catch (err) {
				return releaseFailure(err, "Failed to publish release.");
			}
		}
	);

	server.registerTool(
		"delete_release",
		{
			title: "Delete release",
			description:
				"Permanently delete a release. Its tasks are unlinked from it, not deleted. This can't be undone — confirm with the user first.",
			inputSchema: z.object({ org: orgArg, release: releaseArg }),
			annotations: { destructiveHint: true },
		},
		async ({ org, release: releaseRef }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "delete releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			try {
				await deleteReleaseService({ orgId: g.orgId, release });
				return toolJson({ id: release.id, deleted: true });
			} catch (err) {
				return releaseFailure(err, "Failed to delete release.");
			}
		}
	);
}
