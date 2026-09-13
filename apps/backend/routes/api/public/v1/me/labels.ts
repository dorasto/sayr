import { getLabels, getOrCreateLabel } from "@repo/database";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId } from "../../../../../lib/apiRefs";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";

export const labelsRoute = new Hono<AppEnv>();

const LabelSchema = z.looseObject({
	id: z.string(),
	organizationId: z.string(),
	name: z.string(),
	color: z.string().nullable(),
	visible: z.enum(["public", "private"]),
});

/**
 * Same gap/fix shape as categories/releases: there was previously no `/me/*`
 * way to list an organization's labels (only the per-task `labels` relation,
 * and only ever the full set, never enumerable on its own) — needed so a
 * client can build a labels picker instead of only showing whatever a task
 * already has. Returns both public and private labels: this is a
 * member-authenticated route, same as `/me/tasks` including both visibilities
 * rather than degrading to the anonymous public-only view.
 */
labelsRoute.get(
	"/labels",
	describeOkNotFound({
		summary: "List Labels",
		description: "List an organization's labels (public and private). Requires org membership.",
		dataSchema: z.array(LabelSchema),
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
					"You don't have permission to read labels.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const labels = await getLabels(orgId);
		return c.json(successResponse(labels));
	}
);

const CreateLabelBody = {
	type: "object",
	required: ["orgId", "name"],
	properties: {
		orgId: { type: "string", description: 'Organization slug (e.g. "platform") or organization id.' },
		name: { type: "string" },
		color: { type: "string", description: "Hex color, e.g. #3B82F6. Defaults to a neutral gray." },
		visible: { type: "string", enum: ["public", "private"], description: 'Defaults to "public".' },
	},
};

/**
 * Idempotent by `(orgId, name)` — mirrors `getOrCreateLabel`'s own documented
 * behavior. "Create if missing" rather than "error if it already exists":
 * a client offering "add a label" while typing a name that turns out to
 * already exist should just get that label back, not a conflict error.
 */
labelsRoute.post(
	"/labels",
	describeOkNotFound({
		summary: "Create Label",
		description:
			"Create a new label in an organization, or return the existing one if a label with the same name already exists. Requires the manageLabels scope.",
		dataSchema: LabelSchema,
		bodySchema: CreateLabelBody,
		bodyExample: { orgId: "platform", name: "bug", color: "#EF4444" },
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const orgId = await resolveOrganizationId(body.orgId);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "content.manageLabels");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to manage labels.",
					"Your API key or your role in this organization doesn't allow this."
				),
				403
			);
		}

		const name = typeof body.name === "string" ? body.name.trim() : "";
		if (!name) {
			return c.json(errorResponse("Invalid label", "A non-empty name is required."), 400);
		}
		const color = typeof body.color === "string" && body.color.trim() !== "" ? body.color.trim() : undefined;
		const visible = body.visible === "private" ? "private" : "public";

		const created = await getOrCreateLabel(orgId, name, color, visible);
		return c.json(successResponse(created));
	}
);
