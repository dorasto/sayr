import { getReleases, schema } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { enforceLimit } from "@/util";
import { loadReleaseDetail } from "../../../../../lib/releases/detail";
import {
	parseCreateReleaseInput,
	parseStatusFilter,
	parseUpdateReleaseInput,
	RELEASE_STATUSES,
} from "../../../../../lib/releases/input";
import {
	createReleaseService,
	deleteReleaseService,
	markReleasedService,
	updateReleaseService,
} from "../../../../../lib/releases/lifecycle";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { successResponse } from "../../../../../responses";
import { guardReleaseRoute, invalidBody, invalidRequest, readJsonBody, releaseErrorResponse } from "./release-access";
import {
	conflictResponse,
	createForbiddenResponse,
	DeletedSchema,
	invalidRequestResponse,
	orgIdBodyProperty,
	orgIdQueryParam,
	PublishReleaseSchema,
	ReleaseDetailSchema,
	ReleaseSchema,
	releasePathParam,
} from "./release-schemas";

export const releasesRoute = new Hono<AppEnv>();

/**
 * Same gap as `categories.ts`: a task's `releaseId` is a raw id (the DB
 * column, per `packages/database/schema/release.schema.ts`), never expanded
 * server-side, and there was previously no `/me/*` way to resolve one to a
 * name/color at all — only the anonymous `/organization/:slug/releases`
 * equivalent existed. Reuses `@repo/database`'s own `getReleases(orgId)`
 * rather than a hand-rolled query, unlike `categories.ts` (no equivalent
 * shared helper existed for categories at the time).
 *
 * The response is a bare array of raw release rows — the Paseo plugin (via
 * `sayr releases list --json`) depends on that exact shape, so it must not
 * change. The optional `status` filter only narrows which rows come back.
 */
releasesRoute.get(
	"/releases",
	describeOkNotFound({
		summary: "List Releases",
		description: "List an organization's releases. Requires org membership and the tasks.read scope.",
		dataSchema: z.array(ReleaseSchema),
		parameters: [
			orgIdQueryParam,
			{
				name: "status",
				in: "query",
				required: false,
				schema: { type: "string", enum: [...RELEASE_STATUSES] },
				description: "Only return releases in this status. Omit to return every status.",
			},
		],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "tasks.read",
			action: "read releases",
		});
		if (!guard.ok) return guard.response;

		const status = parseStatusFilter(c.req.query("status"));
		if (!status.ok) return invalidRequest(c, status.error);

		const releases = await getReleases(guard.orgId, status.value);
		return c.json(successResponse(releases));
	}
);

releasesRoute.get(
	"/releases/:release",
	describeOkNotFound({
		summary: "Get Release",
		description:
			"Get one release by slug or id: its details, description as Markdown, creator and lead, labels, linked GitHub pull requests, a slim task list (no embeddings or descriptions), and task counts. Requires org membership and the tasks.read scope.",
		dataSchema: ReleaseDetailSchema,
		parameters: [releasePathParam, orgIdQueryParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "tasks.read",
			action: "read this release",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		return c.json(successResponse(await loadReleaseDetail(guard.release)));
	}
);

const CreateReleaseBody = {
	type: "object",
	required: ["orgId", "name"],
	properties: {
		orgId: orgIdBodyProperty,
		name: { type: "string" },
		slug: {
			type: "string",
			description:
				'Lowercase letters, numbers, ".", "_" and "-", with at least one letter or number. Must be unique in the organization. Defaults to a slug generated from the name, which turns everything but letters and numbers into "-" ("Version 1.2.0" becomes "version-1-2-0"), so pass a slug to keep dots.',
		},
		description: { type: "string", description: "Markdown." },
		status: { type: "string", enum: [...RELEASE_STATUSES], description: 'Defaults to "planned".' },
		targetDate: { type: "string", description: "ISO date, e.g. 2026-10-01." },
		releasedAt: {
			type: "string",
			description: 'ISO date. Defaults to now when the release is created with status "released".',
		},
		color: { type: "string", description: "Hex (#3B82F6) or hsla(217, 91%, 60%, 1). Defaults to blue." },
		icon: { type: "string", description: 'Icon name. Defaults to "IconRocket".' },
	},
};

releasesRoute.post(
	"/releases",
	describeOkNotFound({
		summary: "Create Release",
		description:
			"Create a release. Requires the content.manageReleases scope, and your role must include the Manage releases permission. Returns 409 if the slug is already taken, and 403 if the organization's plan or the instance's release limit is reached.",
		dataSchema: ReleaseSchema,
		bodySchema: CreateReleaseBody,
		bodyExample: { orgId: "platform", name: "Version 1.2.0", slug: "v1.2.0", targetDate: "2026-10-01" },
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: {
			...bearerAuthResponses,
			...invalidRequestResponse,
			...conflictResponse,
			...createForbiddenResponse,
		},
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "content.manageReleases",
			action: "create releases",
		});
		if (!guard.ok) return guard.response;

		const input = parseCreateReleaseInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		// Instance-wide limit for self-hosted editions. The per-organization plan
		// limit (cloud) is checked in the service.
		const limitResponse = await enforceLimit({
			c,
			limitKey: "releases",
			table: schema.release,
			traceName: "release.count_all",
			entityName: "release",
			traceAsync,
			recordWideError,
		});
		if (limitResponse) return limitResponse;

		try {
			const release = await createReleaseService({
				orgId: guard.orgId,
				actorUserId: guard.principal.userId,
				input: input.value,
			});
			return c.json(successResponse(release));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.create.failed",
				code: "RELEASE_CREATION_FAILED",
				message: "Failed to create release",
				contextData: { orgId: guard.orgId, slug: input.value.slug },
			});
		}
	}
);

const UpdateReleaseBody = {
	type: "object",
	required: ["orgId"],
	properties: {
		orgId: orgIdBodyProperty,
		name: { type: "string" },
		slug: { type: "string", description: "Must be unique in the organization." },
		description: { type: "string", description: "Markdown. Pass an empty string to clear it." },
		status: {
			type: "string",
			enum: [...RELEASE_STATUSES],
			description:
				'Setting "released" here does NOT close the release\'s tasks — call the publish route for that (it works on a release that is already released). Setting "released" on a release with no release date stamps it; moving a release off "released" clears the date.',
		},
		targetDate: { type: ["string", "null"], description: "ISO date, or null to clear." },
		releasedAt: { type: ["string", "null"], description: "ISO date, or null to clear." },
		color: { type: "string", description: "Hex (#3B82F6) or hsla(217, 91%, 60%, 1)." },
		icon: { type: "string" },
		leadId: { type: ["string", "null"], description: "User id of an organization member, or null to clear." },
	},
};

releasesRoute.patch(
	"/releases/:release",
	describeOkNotFound({
		summary: "Update Release",
		description:
			"Update a release's fields; only the fields you send change. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: ReleaseSchema,
		bodySchema: UpdateReleaseBody,
		bodyExample: { orgId: "platform", status: "in-progress" },
		parameters: [releasePathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse, ...conflictResponse },
	}),
	async (c) => {
		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "content.manageReleases",
			action: "update releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const input = parseUpdateReleaseInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		try {
			const release = await updateReleaseService({ orgId: guard.orgId, release: guard.release, input: input.value });
			return c.json(successResponse(release));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.update.failed",
				code: "RELEASE_UPDATE_FAILED",
				message: "Failed to update release",
				contextData: { orgId: guard.orgId, releaseId: guard.release.id },
			});
		}
	}
);

releasesRoute.post(
	"/releases/:release/publish",
	describeOkNotFound({
		summary: "Publish Release",
		description:
			"Mark a release as released and close every task in it that isn't already done or canceled (each closed task gets a timeline entry and is counted in `updatedTaskCount`). Safe to repeat, and works on a release whose status was already set to released on its own (which doesn't close its tasks): it still closes the open tasks it finds, and keeps the release date it already has. `alreadyReleased` is true only when nothing needed doing: the release was already released and had no open tasks, so nothing is written. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: PublishReleaseSchema,
		bodySchema: {
			type: "object",
			required: ["orgId"],
			properties: { orgId: orgIdBodyProperty },
		},
		bodyExample: { orgId: "platform" },
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
			action: "publish releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		try {
			const result = await markReleasedService({
				orgId: guard.orgId,
				release: guard.release,
				actorUserId: guard.principal.userId,
			});
			return c.json(successResponse(result));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.publish.failed",
				code: "RELEASE_PUBLISH_FAILED",
				message: "Failed to publish release",
				contextData: { orgId: guard.orgId, releaseId: guard.release.id },
			});
		}
	}
);

releasesRoute.delete(
	"/releases/:release",
	describeOkNotFound({
		summary: "Delete Release",
		description:
			"Delete a release. Its tasks are unlinked from it, not deleted. This can't be undone. Requires the content.manageReleases scope, and your role must include the Manage releases permission.",
		dataSchema: DeletedSchema,
		parameters: [releasePathParam, orgIdQueryParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "content.manageReleases",
			action: "delete releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		try {
			await deleteReleaseService({ orgId: guard.orgId, release: guard.release });
			return c.json(successResponse({ id: guard.release.id }));
		} catch (err) {
			return releaseErrorResponse(c, err, {
				name: "release.delete.failed",
				code: "RELEASE_DELETE_FAILED",
				message: "Failed to delete release",
				contextData: { orgId: guard.orgId, releaseId: guard.release.id },
			});
		}
	}
);
