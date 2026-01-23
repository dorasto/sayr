import {
	db,
	getLabels,
	getOrganizationPublic,
	getTaskByShortId,
	schema, auth as authSchema,
	getOrganizations,
} from "@repo/database";
import { and, eq, sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import type { AppEnv } from "@/index";
import {
	describeOkNotFound,
	describePaginatedRoute,
} from "../../../../openapi/helpers";
import {
	errorResponse,
	paginatedSuccessResponse,
	successResponse,
} from "../../../../responses";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { prosekitJSONToHTML } from "@/prosekit/html";
import { prosekitJSONToMarkdown } from "@/prosekit/markdown";
import { openAPIRouteHandler } from "hono-openapi";
import { auth } from "@repo/auth";

const API_LIMITS = {
	comments: 30,
	tasks: 50,
};
// --- API Setup ---
export const apiPublicRouteV1 = new Hono<AppEnv>();
apiPublicRouteV1.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		credentials: false,
	}),
);
apiPublicRouteV1.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	c.header("X-Service-Name", "Sayr.io Public API");
	return next();
});
apiPublicRouteV1.get(
	"/openapi.json",
	openAPIRouteHandler(apiPublicRouteV1, {
		documentation: {
			info: {
				title: "sayr.io v1 Public API",
				version: "1.0.0",
				description: "Sayr.io public API v1 documentation.",
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
					},
				},
			},
			servers: [
				{
					url: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/api/public/v1` : `https://api.${process.env.VITE_ROOT_DOMAIN}/v1`}`,
					description: process.env.APP_ENV === "development" ? "Development" : "Production",
				},
			],
		},
	})
);

/**
 * Public user inside organization member
 */
const OrganizationMemberUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
});

/**
 * Organization member
 */
const OrganizationMemberSchema = z.object({
	id: z.string(),
	userId: z.string(),
	organizationId: z.string(),
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
	user: OrganizationMemberUserSchema,
});

//@ts-expect-error
const OrganizationSchema = createSelectSchema(schema.organization)
	.omit({ privateId: true })
	.extend({
		createdAt: z.preprocess(
			(v) => (v instanceof Date ? v.toISOString() : v),
			z.string(),
		),
		updatedAt: z.preprocess(
			(v) => (v instanceof Date ? v.toISOString() : v),
			z.string(),
		),
		wsUrl: z.string(),
		members: z.array(OrganizationMemberSchema),
	});
apiPublicRouteV1.get(
	"/organization/:org_slug",
	describeOkNotFound({
		summary: "Get organization",
		description: "Retrieve public information for an organization identified by its slug.",
		dataSchema: OrganizationSchema,
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");
		const orgSlug = c.req.param("org_slug");

		const organization = await traceAsync(
			"organization.public.fetch",
			() => getOrganizationPublic(orgSlug),
			{
				description: "Fetching public organization by slug",
				data: { orgSlug },
				onSuccess: (result) =>
					result
						? {
							description: "Public organization data fetched",
							data: { id: result.id, slug: result.slug },
						}
						: { description: "No organization found" },
			},
		);

		if (!organization) {
			await recordWideError({
				name: "organization.public.notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found for given slug",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}

		// biome-ignore lint/correctness/noUnusedVariables: <needed>
		const { privateId, ...publicOrg } = organization;
		return c.json(
			successResponse({
				...publicOrg,
				wsUrl: `${process.env.APP_ENV === "development" ? `ws://api.${process.env.VITE_ROOT_DOMAIN}:5468` : `wss://api.${process.env.VITE_ROOT_DOMAIN}`}/ws?orgId=${publicOrg.id}&ref=publicApi`,
			})
		);
	},
);

//@ts-expect-error
const LabelSchema = createSelectSchema(schema.label).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
});
apiPublicRouteV1.get(
	"/organization/:org_slug/labels",
	describeOkNotFound({
		summary: "List organization labels",
		description: "Retrieve all public labels associated with an organization.",
		dataSchema: z.array(LabelSchema),
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");
		const orgSlug = c.req.param("org_slug");

		const organization = await traceAsync(
			"organization.labels.org_lookup",
			() => getOrganizationPublic(orgSlug),
			{
				description: "Finding organization by slug",
				data: { orgSlug },
			},
		);

		if (!organization) {
			await recordWideError({
				name: "organization.labels.notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found for labels",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}

		const labels = await traceAsync(
			"organization.labels.fetch",
			() => getLabels(organization.id),
			{
				description: "Fetching organization labels",
				data: { orgId: organization.id, slug: organization.slug },
				onSuccess: (result) => ({
					description: "Organization labels fetched",
					data: { count: result.length },
				}),
			},
		);

		return c.json(successResponse(labels));
	},
);

//@ts-expect-error
const CategorySchema = createSelectSchema(schema.category).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
});
apiPublicRouteV1.get(
	"/organization/:org_slug/categories",
	describeOkNotFound({
		summary: "List organization categories",
		description: "Retrieve all public categories associated with an organization.",
		dataSchema: z.array(CategorySchema),
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
			{
				name: "order",
				in: "query",
				required: false,
				schema: {
					type: "string",
					enum: ["asc", "desc"],
					default: "desc",
				},
				description:
					"Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
			},
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");
		const orgSlug = c.req.param("org_slug");
		const order = c.req.query("order") === "asc" ? "asc" : "desc";

		const organization = await traceAsync(
			"organization.categories.org_lookup",
			() => getOrganizationPublic(orgSlug),
			{ description: "Finding organization by slug", data: { orgSlug } },
		);

		if (!organization) {
			await recordWideError({
				name: "organization.categories.notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found for categories",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}

		const categories = await traceAsync(
			"organization.categories.fetch",
			() =>
				db.query.category.findMany({
					orderBy: (tC, { asc, desc }) =>
						order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt),
					where: (category) => eq(category.organizationId, organization.id),
				}),
			{
				description: "Fetching organization categories",
				data: { orgId: organization.id, slug: organization.slug, order },
				onSuccess: (result) => ({
					description: "Organization categories fetched",
					data: { count: result.length },
				}),
			},
		);

		return c.json(successResponse(categories));
	},
);

//@ts-expect-error
const TaskSchema = createSelectSchema(schema.task).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
	updatedAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
	descriptionHtml: z.string(),
	descriptionMarkdown: z.string(),
});
apiPublicRouteV1.get(
	"/organization/:org_slug/tasks",
	describePaginatedRoute({
		summary: "List organization tasks",
		description: "Retrieve a paginated list of public tasks for an organization.",
		dataSchema: TaskSchema,
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
			{
				name: "order",
				in: "query",
				required: false,
				schema: {
					type: "string",
					enum: ["asc", "desc"],
					default: "desc",
				},
				description:
					"Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
			},
		],
		maxLimit: API_LIMITS.tasks,
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		try {
			const query = c.req.query();
			const orgSlug = c.req.param("org_slug");
			const order = query.order === "asc" ? "asc" : "desc";
			const page = Math.max(Number(query.page) || 1, 1);
			const requestedLimit = Number(query.limit);
			const limit = Math.min(requestedLimit || 5, API_LIMITS.tasks);
			const offset = (page - 1) * limit;

			const organization = await traceAsync(
				"organization.tasks.org_lookup",
				() => getOrganizationPublic(orgSlug),
				{
					description: "Finding organization by slug",
					data: { orgSlug },
				},
			);

			if (!organization) {
				await recordWideError({
					name: "organization.tasks.notfound",
					error: new Error("Organization not found"),
					code: "NOT_FOUND",
					message: "No organization found for tasks",
					contextData: { orgSlug },
				});
				return c.json(errorResponse("Organization not found"), 404);
			}

			if (requestedLimit > API_LIMITS.tasks) {
				await recordWideError({
					name: "organization.tasks.limit_overflow",
					error: new Error("Limit overflow"),
					code: "LIMIT_OVERFLOW",
					message: `Requested limit ${requestedLimit} exceeds max ${API_LIMITS.tasks}`,
					contextData: { orgSlug, requestedLimit, maxLimit: API_LIMITS.tasks },
				});
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.tasks}`,
					),
					400,
				);
			}

			const totalItems = await traceAsync(
				"organization.tasks.count",
				async () => {
					const [result] = await db
						.select({ count: sql<number>`count(*)` })
						.from(schema.task)
						.where(eq(schema.task.organizationId, organization.id));
					return Number(result?.count ?? 0);
				},
				{
					description: "Counting total tasks",
					data: { orgId: organization.id },
				},
			);

			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

			if (page > totalPages && totalItems > 0) {
				await recordWideError({
					name: "organization.tasks.page_overflow",
					error: new Error("Page overflow"),
					code: "PAGE_OVERFLOW",
					message: `Requested page ${page} exceeds total ${totalPages}`,
					contextData: { orgSlug, page, totalPages, totalItems },
				});
				return c.json(
					errorResponse(
						`Page ${page} not found`,
						`Valid pages range from 1 to ${totalPages}`,
					),
					400,
				);
			}

			const tasks = await traceAsync(
				"organization.tasks.fetch",
				async () => {
					const rows = await db.query.task.findMany({
						orderBy: (tC, { asc, desc }) =>
							order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt),
						where: (t) => eq(t.organizationId, organization.id),
						limit,
						offset,
						with: {
							createdBy: { columns: { name: true, image: true } },
							category: { columns: { id: true, name: true } },
						},
					});

					return rows.map((t) => ({
						...t,
						descriptionHtml: t.description && prosekitJSONToHTML(t.description),
						descriptionMarkdown: t.description && prosekitJSONToMarkdown(t.description),
					}));
				},
				{
					description: "Fetching paginated tasks",
					data: { orgId: organization.id, page, limit, order },
					onSuccess: (result) => ({
						description: "Organization tasks fetched",
						data: { taskCount: result.length, totalItems, totalPages },
					}),
				},
			);

			return c.json(
				paginatedSuccessResponse(tasks, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				}),
			);
		} catch (err) {
			await recordWideError({
				name: "organization.tasks.error",
				error: err,
				message: "Failed to fetch organization tasks",
				contextData: { path: c.req.path, query: c.req.query() },
			});
			return c.json(errorResponse("Database error", "Unexpected error"), 500);
		}
	},
);

apiPublicRouteV1.get(
	"/organization/:org_slug/tasks/:task_short_id",
	describeOkNotFound({
		summary: "Get task",
		description: "Retrieve a public task by its short identifier.",
		dataSchema: TaskSchema,
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
			{
				name: "task_short_id",
				in: "path",
				required: true,
				schema: { type: "integer" },
			},
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		const orgSlug = c.req.param("org_slug");
		const taskShortIdRaw = c.req.param("task_short_id");
		const taskShortId = Number(taskShortIdRaw);

		if (Number.isNaN(taskShortId)) {
			await recordWideError({
				name: "task.byshortid.validation",
				error: new Error("Invalid task_short_id"),
				code: "INVALID_ID",
				message: "task_short_id must be a number",
				contextData: { orgSlug, taskShortIdRaw },
			});
			return c.json(
				errorResponse("Invalid task_short_id", "Must be a number"),
				400,
			);
		}

		const organization = await traceAsync(
			"task.byshortid.org_lookup",
			() => getOrganizationPublic(orgSlug),
			{
				description: "Finding organization by slug",
				data: { orgSlug },
			},
		);

		if (!organization) {
			await recordWideError({
				name: "task.byshortid.org_notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}

		const task = await traceAsync(
			"task.byshortid.fetch",
			() => getTaskByShortId(organization.id, taskShortId),
			{
				description: "Fetching task by short ID",
				data: { orgId: organization.id, taskShortId },
				onSuccess: (result) =>
					result
						? {
							description: "Task fetched successfully",
							data: { taskId: result.id, shortId: result.shortId },
						}
						: { description: "Task not found" },
			},
		);

		if (!task) {
			await recordWideError({
				name: "task.byshortid.notfound",
				error: new Error("Task not found"),
				code: "NOT_FOUND",
				message: "No task found",
				contextData: { orgId: organization.id, orgSlug, taskShortId },
			});
			return c.json(errorResponse("No Task found"), 404);
		}

		return c.json(
			successResponse({
				...task,
				descriptionHtml: task.description && prosekitJSONToHTML(task.description),
				descriptionMarkdown: task.description && prosekitJSONToMarkdown(task.description),
			}),
		);
	},
);

//@ts-expect-error
const CommentSchema = createSelectSchema(schema.taskComment).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
	updatedAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
	createdBy: z
		.object({
			name: z.string().nullable(),
			image: z.string().nullable(),
		})
		.nullable()
		.optional(),
	contentHtml: z.string(),
	contentMarkdown: z.string(),
	reactions: z
		.object({
			total: z.number(),
			reactions: z.record(
				z.string(),
				z.object({
					count: z.number(),
					users: z.array(z.string()),
				}),
			),
		})
		.optional(),
});
apiPublicRouteV1.get(
	"/organization/:org_slug/tasks/:task_short_id/comments",
	describePaginatedRoute({
		summary: "List task comments",
		description: "Retrieve a paginated list of public comments for a task.",
		dataSchema: CommentSchema,
		parameters: [
			{
				name: "org_slug",
				in: "path",
				required: true,
				schema: { type: "string" },
			},
			{
				name: "task_short_id",
				in: "path",
				required: true,
				schema: { type: "integer" },
			},
			{
				name: "order",
				in: "query",
				required: false,
				schema: {
					type: "string",
					enum: ["asc", "desc"],
					default: "desc",
				},
				description:
					"Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
			},
		],
		maxLimit: API_LIMITS.comments,
		tags: ["Organization"],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		try {
			const query = c.req.query();
			const orgSlug = c.req.param("org_slug");
			const taskShortIdRaw = c.req.param("task_short_id");
			const taskShortId = Number(taskShortIdRaw);
			const order = query.order === "asc" ? "asc" : "desc";
			const page = Math.max(Number(query.page) || 1, 1);
			const requestedLimit = Number(query.limit);
			const limit = Math.min(requestedLimit || 5, API_LIMITS.comments);
			const offset = (page - 1) * limit;

			if (Number.isNaN(taskShortId)) {
				await recordWideError({
					name: "task.comments.validation",
					error: new Error("Invalid task_short_id"),
					code: "INVALID_ID",
					message: "task_short_id must be a number",
					contextData: { orgSlug, taskShortIdRaw },
				});
				return c.json(
					errorResponse("Invalid task_short_id", "Must be a number"),
					400,
				);
			}

			const org = await traceAsync(
				"task.comments.org_lookup",
				() => getOrganizationPublic(orgSlug),
				{
					description: "Finding organization by slug",
					data: { orgSlug },
				},
			);

			if (!org) {
				await recordWideError({
					name: "task.comments.org_notfound",
					error: new Error("Organization not found"),
					code: "NOT_FOUND",
					message: "No organization found",
					contextData: { orgSlug },
				});
				return c.json(errorResponse("Organization not found"), 404);
			}

			const task = await traceAsync(
				"task.comments.task_lookup",
				() => getTaskByShortId(org.id, taskShortId),
				{
					description: "Finding task by short ID",
					data: { orgId: org.id, taskShortId },
				},
			);

			if (!task) {
				await recordWideError({
					name: "task.comments.task_notfound",
					error: new Error("Task not found"),
					code: "NOT_FOUND",
					message: "No task found for comments query",
					contextData: { orgId: org.id, orgSlug, taskShortId },
				});
				return c.json(errorResponse("Task not found"), 404);
			}

			if (requestedLimit > API_LIMITS.comments) {
				await recordWideError({
					name: "task.comments.limit_overflow",
					error: new Error("Limit overflow"),
					code: "LIMIT_OVERFLOW",
					message: `Requested limit ${requestedLimit} exceeds max ${API_LIMITS.comments}`,
					contextData: {
						orgSlug,
						taskShortId,
						requestedLimit,
						maxLimit: API_LIMITS.comments,
					},
				});
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.comments}`,
					),
					400,
				);
			}

			const totalItems = await traceAsync(
				"task.comments.count",
				async () => {
					const [result] = await db
						.select({ count: sql<number>`count(*)` })
						.from(schema.taskComment)
						.where(
							and(
								eq(schema.taskComment.taskId, task.id),
								eq(schema.taskComment.organizationId, org.id),
								eq(schema.taskComment.visibility, "public"),
							),
						);
					return Number(result?.count ?? 0);
				},
				{
					description: "Counting public comments",
					data: { orgId: org.id, taskId: task.id },
				},
			);

			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

			if (page > totalPages && totalItems > 0) {
				await recordWideError({
					name: "task.comments.page_overflow",
					error: new Error("Page overflow"),
					code: "PAGE_OVERFLOW",
					message: `Requested page ${page} exceeds total ${totalPages}`,
					contextData: { orgSlug, taskShortId, page, totalPages, totalItems },
				});
				return c.json(
					errorResponse(
						`Page ${page} not found`,
						`Valid pages range from 1 to ${totalPages}`,
					),
					400,
				);
			}

			const comments = await traceAsync(
				"task.comments.fetch",
				async () => {
					const rows = await db.query.taskComment.findMany({
						where: (tC) =>
							and(
								eq(tC.taskId, task.id),
								eq(tC.organizationId, org.id),
								eq(schema.taskComment.visibility, "public"),
							),
						orderBy: (tC, { asc, desc }) =>
							order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt),
						limit,
						offset,
						with: {
							createdBy: { columns: { name: true, image: true } },
							reactions: {
								columns: { emoji: true, userId: true },
							},
						},
					});
					const mapped = rows.map((comment) => {
						const grouped: Record<string, { count: number; users: string[] }> =
							{};

						for (const reaction of comment.reactions ?? []) {
							if (!grouped[reaction.emoji]) {
								grouped[reaction.emoji] = { count: 0, users: [] };
							}

							const reactionGroup = grouped[reaction.emoji];
							if (reactionGroup) {
								reactionGroup.count++;
								reactionGroup.users.push(reaction.userId);
							}
						}

						const total = Object.values(grouped).reduce(
							(sum, r) => sum + r.count,
							0,
						);

						return {
							...comment,
							contentHtml: comment.content && prosekitJSONToHTML(comment.content),
							contentMarkdown: comment.content && prosekitJSONToMarkdown(comment.content),
							reactions: {
								total,
								reactions: grouped,
							},
						};
					});
					return mapped;
				},
				{
					description: "Fetching paginated comments",
					data: { orgId: org.id, taskId: task.id, page, limit, order },
					onSuccess: (result) => ({
						description: "Task comments fetched",
						data: { commentCount: result.length, totalItems, totalPages },
					}),
				},
			);

			return c.json(
				paginatedSuccessResponse(comments, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				}),
			);
		} catch (err) {
			await recordWideError({
				name: "task.comments.error",
				error: err,
				message: "Failed to fetch task comments",
				contextData: { path: c.req.path, query: c.req.query() },
			});
			return c.json(errorResponse("Database error", "Unexpected error"), 500);
		}
	},
);


//@ts-expect-error
const PublicUserSchema = createSelectSchema(authSchema.user).pick({
	id: true,
	name: true,
	email: true,
	image: true,
	createdAt: true,
}).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
});
apiPublicRouteV1.get(
	"/me",
	describeOkNotFound({
		summary: "Get User Info",
		description: "Retrieve information about the authenticated user.",
		dataSchema: PublicUserSchema,
		tags: ["User"],
		security: [{ bearerAuth: [] }],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const recordWideError = c.get("recordWideError");

		const authHeader = c.req.header("authorization");
		const token =
			authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length)
				: null;

		if (!token) {
			return c.json(errorResponse("Unauthorized"), 401);
		}

		const apiKeyResult = await traceAsync(
			"auth.apikey.verify",
			() =>
				auth.api.verifyApiKey({
					body: {
						key: token
					},
				}),
			{
				description: "Verifying API key",
				onSuccess: () => ({
					outcome: "API key verified",
				}),
			},
		);

		if (
			!apiKeyResult?.valid ||
			!apiKeyResult.key ||
			!apiKeyResult.key.enabled ||
			!apiKeyResult.key.userId
		) {
			return c.json(errorResponse("Invalid API key"), 401);
		}

		const user = await traceAsync(
			"me.public.fetch",
			() =>
				db.query.user.findFirst({
					where: (u) => eq(u.id, apiKeyResult.key?.userId || ""),
				}),
			{
				description: "Fetching public user info",
				data: { userId: apiKeyResult.key.userId },
				onSuccess: () => ({
					outcome: "Public user info fetched",
				}),
			},
		);

		if (!user) {
			await recordWideError({
				name: "me.public.notfound",
				error: new Error("User not found"),
				code: "NOT_FOUND",
				message: "No user found for API key owner",
				contextData: {
					userId: apiKeyResult.key.userId,
				},
			});

			return c.json(errorResponse("No user found"), 404);
		}

		return c.json(
			successResponse({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				createdAt: user.createdAt.toISOString(),
			}),
		);
	},
);

apiPublicRouteV1.get(
	"/me/organizations",
	describeOkNotFound({
		summary: "Get Users Organizations",
		description: "Retrieve organizations associated with the authenticated user.",
		dataSchema: z.array(OrganizationSchema),
		tags: ["User"],
		security: [{ bearerAuth: [] }],
	}),
	async (c) => {
		const traceAsync = createTraceAsync();

		const authHeader = c.req.header("authorization");
		const token =
			authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length)
				: null;

		if (!token) {
			return c.json(errorResponse("Unauthorized"), 401);
		}

		const apiKeyResult = await traceAsync(
			"auth.apikey.verify",
			() =>
				auth.api.verifyApiKey({
					body: {
						key: token
					},
				}),
			{
				description: "Verifying API key",
				onSuccess: () => ({
					outcome: "API key verified",
				}),
			},
		);

		if (
			!apiKeyResult?.valid ||
			!apiKeyResult.key ||
			!apiKeyResult.key.enabled ||
			!apiKeyResult.key.userId
		) {
			return c.json(errorResponse("Invalid API key"), 401);
		}

		const organizations = await traceAsync(
			"me.public.organizations.fetch",
			() =>
				getOrganizations(apiKeyResult.key?.userId || ""),
			{
				description: "Fetching user's organizations",
				data: { userId: apiKeyResult.key.userId },
				onSuccess: () => ({
					outcome: "User's organizations fetched",
				}),
			},
		);

		return c.json(
			successResponse(organizations.map((org) => {
				const { privateId, ...publicOrg } = org;
				return {
					...publicOrg,
					members: org.members.map((member) => ({
						id: member.id,
						userId: member.userId,
						organizationId: member.organizationId,
						createdAt: member.createdAt,
						user: {
							id: member.user.id,
							name: member.user.name,
							image: member.user.image,
							createdAt: member.user.createdAt,
						},
					})),
					wsUrl: `${process.env.APP_ENV === "development" ? `ws://api.${process.env.VITE_ROOT_DOMAIN}:5468` : `wss://api.${process.env.VITE_ROOT_DOMAIN}`}/ws?orgId=${publicOrg.id}&ref=authenticatedPublicApi`,
				};
			})),
		);
	},
);