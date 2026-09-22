import {
	createReleaseStatusUpdate,
	db,
	deleteReleaseStatusUpdate,
	getReleaseStatusUpdates,
	schema,
	updateReleaseStatusUpdate,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { broadcastReleaseStatusUpdatesChanged } from "../../../../../lib/releases/broadcast";
import {
	parseCreateStatusUpdateInput,
	parseUpdateStatusUpdateInput,
	RELEASE_HEALTHS,
	RELEASE_VISIBILITIES,
} from "../../../../../lib/releases/input";
import { withContentMarkdown } from "../../../../../lib/releases/serialize";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { guardReleaseRoute, invalidBody, invalidRequest, readJsonBody } from "./release-access";
import {
	DeletedSchema,
	invalidRequestResponse,
	orgIdBodyProperty,
	orgIdQueryParam,
	ReleaseStatusUpdateSchema,
	releasePathParam,
} from "./release-schemas";

export const releaseStatusUpdatesRoute = new Hono<AppEnv>();

const updatePathParam = {
	name: "updateId",
	in: "path",
	required: true,
	schema: { type: "string" },
	description: "Status update id.",
};

const StatusUpdateFields = {
	content: { type: "string", description: "Markdown." },
	health: { type: "string", enum: [...RELEASE_HEALTHS], description: 'Defaults to "on_track" when creating.' },
	visibility: {
		type: "string",
		enum: [...RELEASE_VISIBILITIES],
		description: 'Defaults to "public" when creating. "internal" is only visible to organization members.',
	},
};

/** The status update, only if it belongs to this release — an id from another release or org is a 404. */
function findStatusUpdateInRelease(releaseId: string, updateId: string) {
	return db.query.releaseStatusUpdate.findFirst({
		where: and(eq(schema.releaseStatusUpdate.id, updateId), eq(schema.releaseStatusUpdate.releaseId, releaseId)),
	});
}

const STATUS_UPDATE_NOT_FOUND = errorResponse(
	"Status update not found",
	"No status update with that id exists on this release."
);

releaseStatusUpdatesRoute.get(
	"/releases/:release/status-updates",
	describeOkNotFound({
		summary: "List Release Status Updates",
		description:
			"List a release's status updates, newest first, including internal ones. Each has its content as Markdown, its author, and its comment count. Requires org membership and the tasks.read scope.",
		dataSchema: z.array(ReleaseStatusUpdateSchema),
		parameters: [releasePathParam, orgIdQueryParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "tasks.read",
			action: "read release status updates",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const updates = await getReleaseStatusUpdates(guard.release.id, "all");
		return c.json(successResponse(updates.map(withContentMarkdown)));
	}
);

releaseStatusUpdatesRoute.post(
	"/releases/:release/status-updates",
	describeOkNotFound({
		summary: "Create Release Status Update",
		description:
			"Post a status update on a release. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: ReleaseStatusUpdateSchema,
		bodySchema: {
			type: "object",
			required: ["orgId"],
			properties: { orgId: orgIdBodyProperty, ...StatusUpdateFields },
		},
		bodyExample: { orgId: "platform", content: "Testing is on track.", health: "on_track" },
		parameters: [releasePathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "content.manageReleases",
			action: "post release status updates",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const input = parseCreateStatusUpdateInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		const update = await createReleaseStatusUpdate({
			releaseId: guard.release.id,
			organizationId: guard.orgId,
			authorId: guard.principal.userId,
			content: input.value.content,
			health: input.value.health,
			visibility: input.value.visibility,
		});
		broadcastReleaseStatusUpdatesChanged(guard.orgId, guard.release.id);

		return c.json(successResponse(withContentMarkdown(update)));
	}
);

releaseStatusUpdatesRoute.patch(
	"/releases/:release/status-updates/:updateId",
	describeOkNotFound({
		summary: "Update Release Status Update",
		description:
			"Edit a status update; only the fields you send change. The update must belong to this release. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: ReleaseStatusUpdateSchema,
		bodySchema: {
			type: "object",
			required: ["orgId"],
			properties: { orgId: orgIdBodyProperty, ...StatusUpdateFields },
		},
		bodyExample: { orgId: "platform", health: "at_risk" },
		parameters: [releasePathParam, updatePathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "content.manageReleases",
			action: "edit release status updates",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const existing = await findStatusUpdateInRelease(guard.release.id, c.req.param("updateId"));
		if (!existing) return c.json(STATUS_UPDATE_NOT_FOUND, 404);

		const input = parseUpdateStatusUpdateInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		const updated = await updateReleaseStatusUpdate(existing.id, input.value);
		broadcastReleaseStatusUpdatesChanged(guard.orgId, guard.release.id);

		return c.json(successResponse(withContentMarkdown(updated)));
	}
);

releaseStatusUpdatesRoute.delete(
	"/releases/:release/status-updates/:updateId",
	describeOkNotFound({
		summary: "Delete Release Status Update",
		description:
			"Delete a status update, along with the comments on it. The update must belong to this release. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: DeletedSchema,
		parameters: [releasePathParam, updatePathParam, orgIdQueryParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "content.manageReleases",
			action: "delete release status updates",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const existing = await findStatusUpdateInRelease(guard.release.id, c.req.param("updateId"));
		if (!existing) return c.json(STATUS_UPDATE_NOT_FOUND, 404);

		await deleteReleaseStatusUpdate(existing.id);
		broadcastReleaseStatusUpdatesChanged(guard.orgId, guard.release.id);

		return c.json(successResponse({ id: existing.id }));
	}
);
