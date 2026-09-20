import { resolver } from "hono-openapi";
import z from "zod";
import { ApiErrorResponse } from "../../../../../responses";

/**
 * OpenAPI documentation schemas and shared parameter definitions for the
 * `/v1/me` release routes. The response schemas are deliberately loose
 * (`looseObject`, only the identifying fields listed) — they document the
 * shape for the API reference; handlers return the database rows directly and
 * nothing here validates a response.
 */

const errorContent = { "application/json": { schema: resolver(ApiErrorResponse) } };

/** Extra error responses for the release routes, spread next to `bearerAuthResponses` in `extraResponses`. */
export const invalidRequestResponse = {
	400: { description: "The request body, path, or query string is invalid", content: errorContent },
};

export const conflictResponse = {
	409: {
		description: "A conflict: the slug is already in use, or the resource changed while the request was handled",
		content: errorContent,
	},
};

/** Replaces the standard 403 on create: the plan or instance release limit is a 403 too. */
export const createForbiddenResponse = {
	403: {
		description:
			"The key's scopes, or its owner's permissions in this organization, don't allow this; or the organization's plan or the instance's release limit is reached",
		content: errorContent,
	},
};

export const githubFailedResponse = {
	502: { description: "GitHub couldn't be reached or returned an error", content: errorContent },
};

export const ReleaseSchema = z.looseObject({
	id: z.string(),
	organizationId: z.string(),
	name: z.string(),
	slug: z.string(),
	status: z.string(),
	color: z.string().nullable(),
	icon: z.string().nullable(),
});

const UserSummarySchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});

export const ReleaseLabelSchema = z.looseObject({
	id: z.string(),
	organizationId: z.string(),
	name: z.string(),
	color: z.string().nullable(),
	visible: z.enum(["public", "private"]),
});

export const ReleaseLabelsSchema = z.array(ReleaseLabelSchema);

export const ReleaseDetailSchema = ReleaseSchema.extend({
	descriptionMarkdown: z.string().nullable(),
	createdBy: UserSummarySchema.nullable(),
	lead: UserSummarySchema.nullable(),
	labels: z.array(ReleaseLabelSchema),
	githubPullRequests: z.array(
		z.looseObject({
			id: z.string(),
			prNumber: z.number(),
			prUrl: z.string(),
			title: z.string(),
			state: z.string(),
			merged: z.boolean(),
		})
	),
	tasks: z.array(
		z.looseObject({
			id: z.string(),
			shortId: z.number().nullable(),
			title: z.string().nullable(),
			status: z.string(),
			priority: z.string(),
		})
	),
	taskCounts: z.object({
		total: z.number(),
		open: z.number(),
		done: z.number(),
		canceled: z.number(),
	}),
});

export const PublishReleaseSchema = z.object({
	release: ReleaseSchema,
	updatedTaskCount: z.number(),
	alreadyReleased: z.boolean(),
});

export const ReleaseStatusUpdateSchema = z.looseObject({
	id: z.string(),
	releaseId: z.string(),
	organizationId: z.string(),
	health: z.enum(["on_track", "at_risk", "off_track"]),
	visibility: z.enum(["public", "internal"]),
	contentMarkdown: z.string().nullable(),
});

export const ReleaseCommentSchema = z.looseObject({
	id: z.string(),
	releaseId: z.string(),
	organizationId: z.string(),
	statusUpdateId: z.string().nullable(),
	parentId: z.string().nullable(),
	visibility: z.enum(["public", "internal"]),
	contentMarkdown: z.string().nullable(),
});

export const DeletedSchema = z.object({ id: z.string() });

/** `?orgId=` on GET and DELETE routes (POST and PATCH take `orgId` in the body instead). */
export const orgIdQueryParam = {
	name: "orgId",
	in: "query",
	required: true,
	schema: { type: "string" },
	description: 'Organization slug (e.g. "platform") or organization id.',
};

export const releasePathParam = {
	name: "release",
	in: "path",
	required: true,
	schema: { type: "string" },
	description:
		'Release slug (e.g. "v1.2.0", the last part of the release\'s URL) or release id. A slug is lowercase letters, numbers, ".", "_" and "-".',
};

export const orgIdBodyProperty = {
	type: "string",
	description: 'Organization slug (e.g. "platform") or organization id.',
};
