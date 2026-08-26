import { describeRoute, resolver } from "hono-openapi";
import type { z } from "zod";
import { ApiErrorResponse, ApiPaginatedResponse, ApiSuccessResponse } from "../responses";

type JsonSchema = Record<string, unknown>;
/**
 * Generates a describeRoute config for common success + error responses.
 */
export const describeOkNotFound = <T extends z.ZodTypeAny, B extends JsonSchema | undefined = undefined>(opts: {
	summary: string;
	description?: string;
	dataSchema: T;
	bodySchema?: B;
	bodyExample?: Record<string, unknown>;
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	parameters?: any[];
	tags?: string[];
	security?: Record<string, string[]>[];
	/**
	 * Extra status-code entries merged into `responses`, additive to the
	 * standard 200/404. `/v1/me/*` routes use this for 401 (bad/disabled key),
	 * 403 (scope or org-permission denied), and 429 (rate limited) — scope
	 * denial in particular is a defining failure mode there, not an edge case
	 * worth omitting from the docs.
	 */
	extraResponses?: Record<string, unknown>;
}) => {
	const bodyContent = opts.bodySchema
		? {
				required: true,
				content: {
					"application/json": {
						schema: opts.bodySchema,
						example: opts.bodyExample,
					},
				},
			}
		: undefined;

	return describeRoute({
		summary: opts.summary,
		description: opts.description,
		parameters: opts.parameters,
		tags: opts.tags,
		security: opts.security,
		requestBody: bodyContent,
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: resolver(ApiSuccessResponse(opts.dataSchema)),
					},
				},
			},
			404: {
				description: "Not found",
				content: {
					"application/json": {
						schema: resolver(ApiErrorResponse),
					},
				},
			},
			...opts.extraResponses,
		},
	});
};

/** Shared 401/403/429 trio for `/v1/me/*` routes — see `extraResponses` above. */
export const bearerAuthResponses = {
	401: {
		description: "Missing, invalid, disabled, or expired API key",
		content: { "application/json": { schema: resolver(ApiErrorResponse) } },
	},
	403: {
		description: "The key's scopes, or its owner's permissions in this organization, don't allow this",
		content: { "application/json": { schema: resolver(ApiErrorResponse) } },
	},
	429: {
		description: "This API key has hit its rate limit",
		content: { "application/json": { schema: resolver(ApiErrorResponse) } },
	},
};

/**
 * Generates an OpenAPI route config for paginated endpoints
 */
export const describePaginatedRoute = <T extends z.ZodTypeAny>(opts: {
	summary: string;
	description: string;
	dataSchema: T;
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	parameters?: any[];
	defaultLimit?: number;
	maxLimit?: number;
	tags?: string[] | undefined;
	security?: Record<string, string[]>[];
}) =>
	describeRoute({
		summary: opts.summary,
		description: opts.description,
		tags: opts.tags,
		security: opts.security,
		parameters: [
			...(opts.parameters || []),
			{
				name: "limit",
				in: "query",
				schema: { type: "integer", minimum: 1, maximum: opts.maxLimit ?? 50, default: opts.defaultLimit ?? 5 },
				description: "Number of items per page",
			},
			{
				name: "page",
				in: "query",
				schema: { type: "integer", minimum: 1 },
				description: "Page number (starting from 1)",
			},
		],
		responses: {
			200: {
				description: "Paginated list",
				content: {
					"application/json": {
						schema: resolver(ApiPaginatedResponse(opts.dataSchema)),
					},
				},
			},
			400: {
				description: "Invalid pagination parameters",
				content: {
					"application/json": { schema: resolver(ApiErrorResponse) },
				},
			},
			404: {
				description: "Not found",
				content: {
					"application/json": { schema: resolver(ApiErrorResponse) },
				},
			},
			500: {
				description: "Server error",
				content: {
					"application/json": { schema: resolver(ApiErrorResponse) },
				},
			},
		},
	});
