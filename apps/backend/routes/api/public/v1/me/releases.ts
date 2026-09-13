import { getReleases } from "@repo/database";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId } from "../../../../../lib/apiRefs";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";

export const releasesRoute = new Hono<AppEnv>();

const ReleaseSchema = z.looseObject({
	id: z.string(),
	organizationId: z.string(),
	name: z.string(),
	slug: z.string(),
	status: z.string(),
	color: z.string().nullable(),
	icon: z.string().nullable(),
});

/**
 * Same gap as `categories.ts`: a task's `releaseId` is a raw id (the DB
 * column, per `packages/database/schema/release.schema.ts`), never expanded
 * server-side, and there was previously no `/me/*` way to resolve one to a
 * name/color at all — only the anonymous `/organization/:slug/releases`
 * equivalent existed. Reuses `@repo/database`'s own `getReleases(orgId)`
 * rather than a hand-rolled query, unlike `categories.ts` (no equivalent
 * shared helper existed for categories at the time).
 */
releasesRoute.get(
	"/releases",
	describeOkNotFound({
		summary: "List Releases",
		description: "List an organization's releases. Requires org membership.",
		dataSchema: z.array(ReleaseSchema),
		parameters: [
			{
				name: "orgId",
				in: "query",
				required: true,
				schema: { type: "string" },
				description: 'Organization slug (e.g. "platform") or organization id.',
			},
		],
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const orgId = await resolveOrganizationId(c.req.query("orgId"));
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.read");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to read releases.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const releases = await getReleases(orgId);
		return c.json(successResponse(releases));
	}
);
