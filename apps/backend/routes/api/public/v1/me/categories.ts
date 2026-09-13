import { db } from "@repo/database";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId } from "../../../../../lib/apiRefs";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";

export const categoriesRoute = new Hono<AppEnv>();

const CategorySchema = z.looseObject({
	id: z.string(),
	organizationId: z.string(),
	name: z.string(),
	color: z.string(),
	icon: z.string().nullable(),
});

/**
 * Mirrors the anonymous `GET /organization/:org_slug/categories` (index.ts)
 * for the authenticated `/me/*` surface — the same gap the comments/replies
 * routes closed earlier: a task's `category` field is a raw id, never
 * expanded (see `getTaskById`'s `with:` clause), and there was previously no
 * way at all to resolve one to a name via a personal key.
 */
categoriesRoute.get(
	"/categories",
	describeOkNotFound({
		summary: "List Categories",
		description: "List an organization's categories. Requires org membership.",
		dataSchema: z.array(CategorySchema),
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
					"You don't have permission to read categories.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const categories = await db.query.category.findMany({
			where: (category) => eq(category.organizationId, orgId),
			orderBy: (category, { asc }) => asc(category.name),
		});

		return c.json(successResponse(categories));
	}
);
