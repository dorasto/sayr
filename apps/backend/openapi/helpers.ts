import { describeRoute, resolver } from "hono-openapi";
import type { z } from "zod";
import { ApiErrorResponse, ApiPaginatedResponse, ApiSuccessResponse } from "../responses";

/**
 * Generates a describeRoute config for common success + error responses.
 */
export const describeOkNotFound = <T extends z.ZodTypeAny, B extends z.ZodTypeAny | undefined = undefined>(opts: {
	summary: string;
	description?: string;
	dataSchema: T;
	bodySchema?: B;
	bodyExample?: Record<string, unknown>;
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	parameters?: any[];
	tags?: string[];
	security?: Record<string, string[]>[];
}) => {
	const bodyContent: unknown = opts.bodySchema
		? {
			content: {
				"application/json": {
					schema: resolver(opts.bodySchema),
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
		// @ts-expect-error - requestBody type mismatch
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
		},
	});
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
