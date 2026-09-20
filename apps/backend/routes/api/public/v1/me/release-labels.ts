import { addReleaseLabel, getLabel, removeReleaseLabel } from "@repo/database";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { broadcastReleaseLabelsChanged } from "../../../../../lib/releases/broadcast";
import { loadReleaseLabels } from "../../../../../lib/releases/detail";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { guardReleaseRoute, invalidBody, invalidRequest, readJsonBody } from "./release-access";
import {
	invalidRequestResponse,
	orgIdBodyProperty,
	orgIdQueryParam,
	ReleaseLabelsSchema,
	releasePathParam,
} from "./release-schemas";

export const releaseLabelsRoute = new Hono<AppEnv>();

const LABEL_NOT_FOUND = errorResponse("Label not found", "No label with that id exists in this organization.");

releaseLabelsRoute.post(
	"/releases/:release/labels",
	describeOkNotFound({
		summary: "Add Release Label",
		description:
			"Add a label to a release. Adding one it already has is a no-op. The label must belong to the same organization. Returns the release's labels. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: ReleaseLabelsSchema,
		bodySchema: {
			type: "object",
			required: ["orgId", "labelId"],
			properties: { orgId: orgIdBodyProperty, labelId: { type: "string", description: "Label id." } },
		},
		bodyExample: { orgId: "platform", labelId: "label-id" },
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
			action: "manage release labels",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const labelId = typeof body.labelId === "string" ? body.labelId.trim() : "";
		if (!labelId) return invalidRequest(c, '"labelId" is required.');

		// The label must belong to the same organization as the release.
		const label = await getLabel(guard.orgId, labelId);
		if (!label) return c.json(LABEL_NOT_FOUND, 404);

		await addReleaseLabel(guard.release.id, guard.orgId, label.id);
		broadcastReleaseLabelsChanged(guard.orgId, guard.release.id);

		return c.json(successResponse(await loadReleaseLabels(guard.release)));
	}
);

releaseLabelsRoute.delete(
	"/releases/:release/labels/:labelId",
	describeOkNotFound({
		summary: "Remove Release Label",
		description:
			"Remove a label from a release. Removing one it doesn't have is a no-op. Returns the release's remaining labels. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: ReleaseLabelsSchema,
		parameters: [
			releasePathParam,
			{ name: "labelId", in: "path", required: true, schema: { type: "string" }, description: "Label id." },
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
			action: "manage release labels",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const label = await getLabel(guard.orgId, c.req.param("labelId"));
		if (!label) return c.json(LABEL_NOT_FOUND, 404);

		await removeReleaseLabel(guard.release.id, label.id);
		broadcastReleaseLabelsChanged(guard.orgId, guard.release.id);

		return c.json(successResponse(await loadReleaseLabels(guard.release)));
	}
);
