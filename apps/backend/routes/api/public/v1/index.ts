import {
	db,
	getBlockedUserIds,
	getOrganizationPublic,
	getReleasesPage,
	getTaskByShortId,
	getReleaseBySlug,
	getReleaseStatusUpdates,
	getReleaseComments,
	getReleaseCommentReplies,
	schema,
	userSummaryColumns,
} from "@repo/database";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import type { AppEnv } from "@/index";
import { describeOkNotFound, describePaginatedRoute } from "../../../../openapi/helpers";
import { errorResponse, paginatedSuccessResponse, successResponse } from "../../../../responses";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { prosekitJSONToHTML } from "@/prosekit/html";
import { prosekitJSONToMarkdown } from "@/prosekit/markdown";
import { openAPIRouteHandler } from "hono-openapi";
import { Route as apiPublicMeV1 } from "./me";
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
	})
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
					url: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/v1` : `https://api.${process.env.VITE_ROOT_DOMAIN}/v1`}`,
					description: process.env.APP_ENV === "development" ? "Development" : "Production",
				},
			],
		},
	})
);

const OrganizationAPISchema = z.object({
	id: z.string().describe("Organization UUID"),
	slug: z.string().describe("Organization slug used in URLs"),
	name: z.string().describe("Organization name"),
	logo: z.string().nullable().describe("Organization logo URL"),
	bannerImg: z.string().nullable().describe("Organization banner image URL"),
	eventsUrl: z.string().describe("Public: URL to fetch organization events for live updates"),
	members: z
		.array(
			z.object({
				id: z.string().describe("User ID"),
				name: z.string().describe("member name"),
				image: z.string().nullable().describe("avatar URL"),
			})
		)
		.describe("List of organization members with public info"),
});
apiPublicRouteV1.get(
	"/organization/:org_slug",
	describeOkNotFound({
		summary: "Get organization",
		description: "Retrieve public information for an organization identified by its slug.",
		dataSchema: OrganizationAPISchema,
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

		const organization = await traceAsync("public.organization.fetch", () => getOrganizationPublic(orgSlug), {
			description: "Fetching public organization by slug",
			data: { orgSlug },
			onSuccess: (result) =>
				result
					? {
						description: "Public organization data fetched",
						data: { id: result.id, slug: result.slug },
					}
					: { description: "No organization found" },
		});

		if (!organization?.settings?.enablePublicPage) {
			return c.json(errorResponse("No organization found"), 404);
		}

		if (!organization) {
			await recordWideError({
				name: "public.organization.notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found for given slug",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}
		const sanitizedMembers = organization.members.map((m) => ({
			name: m.user.name,
			image: m.user.image,
			id: m.id,
		}));
		return c.json(
			successResponse({
				id: organization.id,
				slug: organization.slug,
				name: organization.name,
				logo: organization.logo,
				bannerImg: organization.bannerImg,
				members: sanitizedMembers,
				eventsUrl: `${process.env.APP_ENV === "development" ? `http://api.${process.env.VITE_ROOT_DOMAIN}:5468/api` : `https://api.${process.env.VITE_ROOT_DOMAIN}`}/events?orgId=${organization.id}&ref=publicApi`,
			})
		);
	}
);

const LabelAPISchema = z.object({
	id: z.string().describe("Label UUID"),
	organizationId: z.string().describe("ID of the organization this label belongs to"),
	name: z.string().describe("Label name"),
	color: z.string().describe("Label color in hsla code"),
	visible: z.enum(["public", "private"]).describe("Label visibility"),
	createdAt: z.string().describe("Label creation timestamp in ISO format"),
});

apiPublicRouteV1.get(
	"/organization/:org_slug/labels",
	describeOkNotFound({
		summary: "List organization labels",
		description: "Retrieve all public labels associated with an organization.",
		dataSchema: z.array(LabelAPISchema),
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

		const organization = await traceAsync("public.organization.labels.org_lookup", () => getOrganizationPublic(orgSlug), {
			description: "Finding organization by slug",
			data: { orgSlug },
		});

		if (!organization?.settings?.enablePublicPage) {
			return c.json(errorResponse("No organization found"), 404);
		}

		if (!organization) {
			await recordWideError({
				name: "public.organization.labels.notfound",
				error: new Error("Organization not found"),
				code: "NOT_FOUND",
				message: "No organization found for labels",
				contextData: { orgSlug },
			});
			return c.json(errorResponse("No organization found"), 404);
		}

		const labels = await traceAsync("public.organization.labels.fetch", () => db.query.label.findMany({
			where: (label) => and(eq(label.organizationId, organization.id), eq(label.visible, "public")),
		}), {
			description: "Fetching organization labels",
			data: { orgId: organization.id, slug: organization.slug },
			onSuccess: (result) => ({
				description: "Organization labels fetched",
				data: { count: result.length },
			}),
		});

		return c.json(successResponse(labels));
	}
);

const categoriesAPISchema = z.object({
	id: z.string().describe("Category UUID"),
	organizationId: z.string().describe("ID of the organization this category belongs to"),
	name: z.string().describe("Category name"),
	color: z.string().describe("Category color in hsla code"),
	icon: z.string().nullable().describe("Category icon URL or identifier"),
	createdAt: z.string().describe("Category creation timestamp in ISO format"),
})

apiPublicRouteV1.get(
	"/organization/:org_slug/categories",
	describeOkNotFound({
		summary: "List organization categories",
		description: "Retrieve all public categories associated with an organization.",
		dataSchema: z.array(categoriesAPISchema),
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
				description: "Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
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
			{ description: "Finding organization by slug", data: { orgSlug } }
		);

		if (!organization?.settings?.enablePublicPage) {
			return c.json(errorResponse("No organization found"), 404);
		}

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
					orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
					where: (category) => eq(category.organizationId, organization.id),
				}),
			{
				description: "Fetching organization categories",
				data: { orgId: organization.id, slug: organization.slug, order },
				onSuccess: (result) => ({
					description: "Organization categories fetched",
					data: { count: result.length },
				}),
			}
		);

		return c.json(successResponse(categories));
	}
);

const TaskAPISchema = z.object({
	id: z.string().describe("Task UUID"),
	organizationId: z.string().describe("ID of the organization this task belongs to"),
	shortId: z.number().describe("Short numeric ID unique within the organization"),
	visible: z.enum(["public"]).describe("Task visibility"),
	createdAt: z.string().describe("Task creation timestamp in ISO format"),
	updatedAt: z.string().describe("Task last update timestamp in ISO format"),
	title: z.string().describe("Task title"),
	description: z.string().describe("Task description in blocknote JSON format"),
	status: z.enum(["backlog", "todo", "in-progress", "done", "cancelled"]).describe("Task status"),
	priority: z.enum(["none", "low", "medium", "high", "urgent"]).describe("Task priority"),
	createdBy: z.object({
		id: z.string().describe("User ID"),
		name: z.string().describe("User name"),
		displayName: z.string().nullable().describe("User display name"),
		image: z.string().nullable().describe("User avatar URL"),
	}).nullable().describe("User who created the task"),
	category: categoriesAPISchema.nullable().describe("Category associated with the task"),
	labels: LabelAPISchema.array().describe("List of labels associated with the task"),
	releaseId: z.string().nullable().describe("ID of the release this task is associated with"),
	voteCount: z.number().describe("Number of votes the task has received"),
	parentId: z.string().nullable().describe("ID of the parent task if this is a subtask"),
	descriptionHtml: z.string().describe("Task description rendered as HTML"),
	descriptionMarkdown: z.string().describe("Task description rendered as Markdown"),
})
apiPublicRouteV1.get(
	"/organization/:org_slug/tasks",
	describePaginatedRoute({
		summary: "List organization tasks",
		description: "Retrieve a paginated list of public tasks for an organization.",
		dataSchema: TaskAPISchema,
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
				description: "Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
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

			const organization = await traceAsync("public.organization.tasks.org_lookup", () => getOrganizationPublic(orgSlug), {
				description: "Finding organization by slug",
				data: { orgSlug },
			});

			if (!organization?.settings?.enablePublicPage) {
				return c.json(errorResponse("No organization found"), 404);
			}

			if (!organization) {
				await recordWideError({
					name: "public.organization.tasks.notfound",
					error: new Error("Organization not found"),
					code: "NOT_FOUND",
					message: "No organization found for tasks",
					contextData: { orgSlug },
				});
				return c.json(errorResponse("Organization not found"), 404);
			}

			if (requestedLimit > API_LIMITS.tasks) {
				await recordWideError({
					name: "public.organization.tasks.limit_overflow",
					error: new Error("Limit overflow"),
					code: "LIMIT_OVERFLOW",
					message: `Requested limit ${requestedLimit} exceeds max ${API_LIMITS.tasks}`,
					contextData: { orgSlug, requestedLimit, maxLimit: API_LIMITS.tasks },
				});
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.tasks}`
					),
					400
				);
			}

			const totalItems = await traceAsync(
				"public.organization.tasks.count",
				async () => {
					const [result] = await db
						.select({ count: sql<number>`count(*)` })
						.from(schema.task)
						.where(and(eq(schema.task.organizationId, organization.id), eq(schema.task.visible, "public")));
					return Number(result?.count ?? 0);
				},
				{
					description: "Counting total tasks",
					data: { orgId: organization.id },
				}
			);

			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

			if (page > totalPages && totalItems > 0) {
				await recordWideError({
					name: "public.organization.tasks.page_overflow",
					error: new Error("Page overflow"),
					code: "PAGE_OVERFLOW",
					message: `Requested page ${page} exceeds total ${totalPages}`,
					contextData: { orgSlug, page, totalPages, totalItems },
				});
				return c.json(errorResponse(`Page ${page} not found`, `Valid pages range from 1 to ${totalPages}`), 400);
			}

			const tasks = await traceAsync(
				"public.organization.tasks.fetch",
				async () => {
					const rows = await db.query.task.findMany({
						orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
						where: (t) => and(eq(t.organizationId, organization.id), eq(t.visible, "public")),
						limit,
						offset,
						with: {
							createdBy: { columns: userSummaryColumns },
							category: { columns: { id: true, name: true } },
						},
					});

					return rows.map((t) => ({
						...t,
						aiSummaryGeneratedAt: null,
						aiSummaryHash: null,
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
				}
			);

			return c.json(
				paginatedSuccessResponse(tasks, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				})
			);
		} catch (err) {
			await recordWideError({
				name: "public.organization.tasks.error",
				error: err,
				message: "Failed to fetch organization tasks",
				contextData: { path: c.req.path, query: c.req.query() },
			});
			return c.json(errorResponse("Database error", "Unexpected error"), 500);
		}
	}
);

apiPublicRouteV1.get(
	"/organization/:org_slug/tasks/:task_short_id",
	describeOkNotFound({
		summary: "Get task",
		description: "Retrieve a public task by its short identifier.",
		dataSchema: TaskAPISchema,
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
			return c.json(errorResponse("Invalid task_short_id", "Must be a number"), 400);
		}

		const organization = await traceAsync("task.byshortid.org_lookup", () => getOrganizationPublic(orgSlug), {
			description: "Finding organization by slug",
			data: { orgSlug },
		});

		if (!organization?.settings?.enablePublicPage) {
			return c.json(errorResponse("No organization found"), 404);
		}

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

		const task = await traceAsync("task.byshortid.fetch", () => getTaskByShortId(organization.id, taskShortId, "public"), {
			description: "Fetching task by short ID",
			data: { orgId: organization.id, taskShortId },
			onSuccess: (result) =>
				result
					? {
						description: "Task fetched successfully",
						data: { taskId: result.id, shortId: result.shortId },
					}
					: { description: "Task not found" },
		});

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
				id: task.id,
				organizationId: task.organizationId,
				shortId: task.shortId,
				visible: task.visible,
				createdAt: task.createdAt?.toISOString(),
				updatedAt: task.updatedAt?.toISOString(),
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				createdBy: task.createdBy,
				category: task.category,
				releaseId: task.releaseId,
				voteCount: task.voteCount,
				parentId: task.parentId,
				descriptionHtml: task.description && prosekitJSONToHTML(task.description),
				descriptionMarkdown: task.description && prosekitJSONToMarkdown(task.description),
			})
		);
	}
);

const CommentAPISchema = z.object({
	id: z.string().describe("Comment UUID"),
	organizationId: z.string().describe("ID of the organization this comment belongs to"),
	taskId: z.string().describe("ID of the task this comment is associated with"),
	createdAt: z.string().describe("Comment creation timestamp in ISO format"),
	updatedAt: z.string().describe("Comment last update timestamp in ISO format"),
	content: z.any().describe("Comment content in BlockNote JSON format"),
	contentHtml: z.string().describe("Comment content rendered as HTML"),
	contentMarkdown: z.string().describe("Comment content rendered as Markdown"),
	createdBy: z
		.object({
			name: z.string().nullable(),
			image: z.string().nullable(),
		})
		.nullable()
		.describe("User who created the comment, or null if user data is not available"),
	visibility: z.enum(["public", "internal"]).describe("Comment visibility level"),
	source: z.enum(["sayr", "github"]).describe("Source of the comment"),
	parentId: z.string().nullable().describe("ID of the parent comment if this is a reply, null if top-level"),
	reactions: z
		.object({
			total: z.number(),
			reactions: z.record(
				z.string(),
				z.object({
					count: z.number(),
					users: z.array(z.string()),
				})
			),
		})
		.optional(),
})
apiPublicRouteV1.get(
	"/organization/:org_slug/tasks/:task_short_id/comments",
	describePaginatedRoute({
		summary: "List task comments",
		description: "Retrieve a paginated list of public comments for a task.",
		dataSchema: CommentAPISchema,
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
				description: "Specifies the sort order by creation date. Use asc for ascending or desc for descending.",
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
				return c.json(errorResponse("Invalid task_short_id", "Must be a number"), 400);
			}

			const org = await traceAsync("task.comments.org_lookup", () => getOrganizationPublic(orgSlug), {
				description: "Finding organization by slug",
				data: { orgSlug },
			});

			if (!org?.settings?.enablePublicPage) {
				return c.json(errorResponse("No organization found"), 404);
			}

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

			const task = await traceAsync("task.comments.task_lookup", () => getTaskByShortId(org.id, taskShortId), {
				description: "Finding task by short ID",
				data: { orgId: org.id, taskShortId },
			});

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
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.comments}`
					),
					400
				);
			}

			const blockedIds = await getBlockedUserIds(org.id);

			const baseConditions = and(
				eq(schema.taskComment.taskId, task.id),
				eq(schema.taskComment.organizationId, org.id),
				eq(schema.taskComment.visibility, "public"),
				blockedIds.length > 0 ? notInArray(schema.taskComment.createdBy, blockedIds) : undefined,
			);

			const totalItems = await traceAsync(
				"task.comments.count",
				async () => {
					const [result] = await db
						.select({ count: sql<number>`count(*)` })
						.from(schema.taskComment)
						.where(baseConditions);
					return Number(result?.count ?? 0);
				},
				{
					description: "Counting public comments",
					data: { orgId: org.id, taskId: task.id },
				}
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
				return c.json(errorResponse(`Page ${page} not found`, `Valid pages range from 1 to ${totalPages}`), 400);
			}

			const comments = await traceAsync(
				"task.comments.fetch",
				async () => {
					const rows = await db.query.taskComment.findMany({
						where: () => baseConditions,
						orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
						limit,
						offset,
						with: {
							createdBy: { columns: userSummaryColumns },
							reactions: {
								columns: { emoji: true, userId: true },
							},
						},
					});
					const mapped = rows.map((comment) => {
						const grouped: Record<string, { count: number; users: string[] }> = {};

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

						const total = Object.values(grouped).reduce((sum, r) => sum + r.count, 0);

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
				}
			);

			return c.json(
				paginatedSuccessResponse(comments, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				})
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
	}
);

const ReleaseAPISchema = z.object({
	id: z.string().describe("Release UUID"),
	organizationId: z.string().describe("ID of the organization this release belongs to"),
	name: z.string().describe("Release name"),
	slug: z.string().describe("Release slug used in URLs"),
	description: z.string().describe("Release description in blocknote JSON format"),
	descriptionHtml: z.string().describe("Release description rendered as HTML"),
	descriptionMarkdown: z.string().describe("Release description rendered as Markdown"),
	status: z.enum(["planned", "in-progress", "released", "archived"]).describe("Release status"),
	targetDate: z.string().describe("Release target date in ISO format"),
	releasedAt: z.string().nullable().describe("Release date in ISO format, null if not released yet"),
	color: z.string().describe("Release color in hsla code"),
	icon: z.string().nullable().describe("Release icon URL or identifier"),
	createdBy: z.object({
		id: z.string().describe("User ID"),
		name: z.string().describe("User name"),
	}).nullable().describe("User who created the release, or null if user data is not available"),
	createdAt: z.string().describe("Release creation timestamp in ISO format"),
	updatedAt: z.string().describe("Release last update timestamp in ISO format"),
})
/**
 * GET /organization/:org_slug/releases
 * Returns paginated releases for an org.
 * Query params: page (default 1), limit (default 10, max 50), status (all|planned|in-progress|released|archived)
 */
apiPublicRouteV1.get(
	"/organization/:org_slug/releases",
	describePaginatedRoute({
		summary: "Get Organization Releases",
		description: "Retrieve paginated releases for the specified organization.",
		dataSchema: ReleaseAPISchema,
		maxLimit: 50,
		tags: ["Organization"],
	}),
	async (c) => {
		const { org_slug } = c.req.param();

		const org = await getOrganizationPublic(org_slug);
		if (!org) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		if (!org.settings?.enablePublicPage) {
			return c.json(errorResponse("Organization not available"), 404);
		}

		const pageParam = Number(c.req.query("page") ?? "1");
		const limitParam = Number(c.req.query("limit") ?? "10");
		const statusParam = (c.req.query("status") ?? "all") as "all" | "planned" | "in-progress" | "released" | "archived";

		const result = await getReleasesPage(org.id, {
			page: pageParam,
			limit: limitParam,
			status: statusParam,
		});
		result.releases = result.releases.map((release) => ({
			...release,
			descriptionHtml: release.description ? prosekitJSONToHTML(release.description) : "",
			descriptionMarkdown: release.description ? prosekitJSONToMarkdown(release.description) : "",
		}));

		return c.json(successResponse(result));
	});

/**
 * GET /organization/:org_slug/releases/:release_slug
 * Returns a single release with its public tasks.
 */
apiPublicRouteV1.get(
	"/organization/:org_slug/releases/:release_slug",
	describeOkNotFound({
		summary: "Get Release",
		description: "Retrieve the specified release for the organization.",
		dataSchema: z.object({
			...ReleaseAPISchema.shape,
			tasks: z.array(TaskAPISchema)
		}),
		tags: ["Organization"]
	}),
	async (c) => {
		const { org_slug, release_slug } = c.req.param();

		const org = await getOrganizationPublic(org_slug);
		if (!org) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		if (!org.settings?.enablePublicPage) {
			return c.json(errorResponse("Organization not available"), 404);
		}

		const release = await getReleaseBySlug(org.id, release_slug);
		if (!release) {
			return c.json(errorResponse("Release not found"), 404);
		}

		// Fetch tasks for this release, public visibility only
		const tasks = await db.query.task.findMany({
			where: (t) => and(eq(t.releaseId, release.id), eq(t.visible, "public")),
			with: {
				labels: {
					with: {
						label: true,
					},
				},
				assignees: {
					with: {
						user: {
							columns: userSummaryColumns,
						},
					},
				},
			},
		});

		const tasksWithLabels = tasks.map((task) => ({
			id: task.id,
			organizationId: task.organizationId,
			shortId: task.shortId,
			visible: task.visible,
			createdAt: task.createdAt?.toISOString(),
			updatedAt: task.updatedAt?.toISOString(),
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
			createdBy: task.createdBy,
			category: task.category,
			releaseId: task.releaseId,
			voteCount: task.voteCount,
			parentId: task.parentId,
			descriptionHtml: task.description && prosekitJSONToHTML(task.description),
			descriptionMarkdown: task.description && prosekitJSONToMarkdown(task.description),
			labels: task.labels.map((l) => l.label),
			assignees: task.assignees.map((a) => a.user),
		}));

		return c.json(
			successResponse({
				...release,
				descriptionHtml: release.description ? prosekitJSONToHTML(release.description) : "",
				descriptionMarkdown: release.description ? prosekitJSONToMarkdown(release.description) : "",
				tasks: tasksWithLabels,
			})
		);
	});

const ReleaseStatusUpdateAPISchema = z.object({
	updates: z.array(
		z.object({
			id: z.string().describe("Status update UUID"),
			releaseId: z.string().describe("ID of the release this status update belongs to"),
			organizationId: z.string().describe("ID of the organization this status update belongs to"),
			content: z.any().nullable().describe("Content of the status update in BlockNote JSON format"),
			contentHtml: z.string().nullable().describe("Content of the status update rendered as HTML"),
			contentMarkdown: z.string().nullable().describe("Content of the status update rendered as Markdown"),
			health: z.enum(["on_track", "at_risk", "off_track"]).describe("Health status of the release"),
			visibility: z.enum(["public", "internal"]).describe("Visibility of the status update"),
			createdAt: z.string().describe("Timestamp when the status update was created"),
			updatedAt: z.string().describe("Timestamp when the status update was last updated"),
			author: z.object({
				id: z.string().describe("User ID of the author"),
				name: z.string().describe("Name of the author"),
				image: z.string().nullable().describe("Image URL of the author"),
				createdAt: z.string().describe("Timestamp when the author was created"),
			}).nullable(),
			commentCount: z.number().describe("Number of comments on the status update"),
		})
	),
});

/**
 * GET /organization/:org_slug/releases/:release_slug/status-updates
 * Returns public status updates for a release.
 */
apiPublicRouteV1.get(
	"/organization/:org_slug/releases/:release_slug/status-updates",
	describeOkNotFound({
		summary: "Get Release Status Updates",
		description: "Retrieve public status updates for the specified release.",
		dataSchema: ReleaseStatusUpdateAPISchema,
		tags: ["Organization"],
	}),
	async (c) => {
		const { org_slug, release_slug } = c.req.param();

		const org = await getOrganizationPublic(org_slug);
		if (!org) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		if (!org.settings?.enablePublicPage) {
			return c.json(errorResponse("Organization not available"), 404);
		}

		const release = await getReleaseBySlug(org.id, release_slug);
		if (!release) {
			return c.json(errorResponse("Release not found"), 404);
		}

		// Fetch only public status updates
		const updates = await getReleaseStatusUpdates(release.id, "public");

		return c.json(
			successResponse({
				updates: updates.map((u) => ({
					id: u.id,
					releaseId: u.releaseId,
					organizationId: u.organizationId,
					content: u.content,
					contentHtml: u.content ? prosekitJSONToHTML(u.content) : "",
					contentMarkdown: u.content ? prosekitJSONToMarkdown(u.content) : "",
					health: u.health,
					visibility: u.visibility,
					createdAt: u.createdAt?.toISOString() ?? "",
					updatedAt: u.updatedAt?.toISOString() ?? "",
					author: u.author,
					commentCount: u.commentCount ?? 0,
				})),
			})
		);
	}
);

const ReleaseCommentAPISchema = z.object({
	comments: z.array(
		z.object({
			id: z.string().describe("Comment UUID"),
			releaseId: z.string().describe("ID of the release this comment belongs to"),
			organizationId: z.string().describe("ID of the organization this comment belongs to"),
			createdBy: z.object({
				id: z.string().describe("User ID of the author"),
				name: z.string().describe("Name of the author"),
				image: z.string().nullable().describe("Image URL of the author"),
				createdAt: z.string().describe("Timestamp when the author was created"),
			}).nullable(),
			content: z.any().describe("Content of the comment in BlockNote JSON format"),
			contentHtml: z.string().describe("Content of the comment rendered as HTML"),
			contentMarkdown: z.string().describe("Content of the comment rendered as Markdown"),
			visibility: z.enum(["public", "internal"]).describe("Visibility of the comment"),
			parentId: z.string().nullable().describe("ID of the parent comment, if this is a reply"),
			statusUpdateId: z.string().nullable().describe("ID of the status update this comment belongs to"),
			replyCount: z.number().describe("Number of replies to this comment"),
			reactions: z.object({
				total: z.number().describe("Total number of reactions"),
				reactions: z.record(
					z.string(),
					z.object({
						count: z.number().describe("Number of reactions of this type"),
						users: z.array(z.string()).describe("List of users who reacted"),
					})
				),
			}).nullable(),
			createdAt: z.string().describe("Timestamp when the comment was created"),
			updatedAt: z.string().describe("Timestamp when the comment was last updated"),
		})
	),
})
/**
 * GET /organization/:org_slug/releases/:release_slug/comments
 * Returns paginated public comments for a release.
 * Query params: page (default 1), limit (default 10, max 30), direction (asc|desc)
 */
apiPublicRouteV1.get(
	"/organization/:org_slug/releases/:release_slug/comments",
	describePaginatedRoute({
		summary: "Get Release Comments",
		description: "Retrieve paginated public comments for the specified release.",
		dataSchema: ReleaseCommentAPISchema,
		tags: ["Organization"],
	}),
	async (c) => {
		const { org_slug, release_slug } = c.req.param();

		const org = await getOrganizationPublic(org_slug);
		if (!org) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		if (!org.settings?.enablePublicPage) {
			return c.json(errorResponse("Organization not available"), 404);
		}

		const release = await getReleaseBySlug(org.id, release_slug);
		if (!release) {
			return c.json(errorResponse("Release not found"), 404);
		}

		const limitParam = Number(c.req.query("limit") ?? "10");
		const pageParam = Number(c.req.query("page") ?? "1");
		const directionParam = c.req.query("direction");
		const statusUpdateIdParam = c.req.query("statusUpdateId");

		const limit = Math.min(limitParam, API_LIMITS.comments);
		const page = Math.max(pageParam, 1);
		const offset = (page - 1) * limit;

		// When statusUpdateId is provided, fetch comments for that update
		// When not provided, fetch only release-level comments (statusUpdateId IS NULL)
		const { comments, total } = await getReleaseComments(release.id, {
			visibility: "public",
			limit,
			offset,
			direction: directionParam === "desc" ? "desc" : directionParam === "asc" ? "asc" : undefined,
			statusUpdateId: statusUpdateIdParam !== undefined ? statusUpdateIdParam : null,
			topLevelOnly: true,
		});

		// Override reply counts to only count public replies
		const commentIds = comments.map((c) => c.id);
		let publicReplyCounts = new Map<string, number>();
		if (commentIds.length > 0) {
			const counts = await db
				.select({
					parentId: schema.releaseComment.parentId,
					count: sql<number>`count(*)::int`,
				})
				.from(schema.releaseComment)
				.where(and(
					eq(schema.releaseComment.releaseId, release.id),
					eq(schema.releaseComment.visibility, "public"),
					inArray(schema.releaseComment.parentId, commentIds)
				))
				.groupBy(schema.releaseComment.parentId);
			publicReplyCounts = new Map(
				counts
					.filter((c) => c.parentId !== null)
					.map((c) => [c.parentId as string, c.count])
			);
		}

		const totalPages = Math.max(Math.ceil(total / limit), 1);

		return c.json(
			successResponse({
				comments: comments.map((c) => ({
					id: c.id,
					releaseId: c.releaseId,
					organizationId: c.organizationId,
					createdBy: c.createdBy,
					content: c.content,
					visibility: c.visibility,
					parentId: c.parentId,
					statusUpdateId: c.statusUpdateId,
					replyCount: publicReplyCounts.get(c.id) ?? 0,
					reactions: c.reactions,
					createdAt: c.createdAt?.toISOString() ?? "",
					updatedAt: c.updatedAt?.toISOString() ?? "",
					contentHtml: c.content ? prosekitJSONToHTML(c.content) : "",
					contentMarkdown: c.content ? prosekitJSONToMarkdown(c.content) : "",
				})),
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasMore: page < totalPages,
				},
			})
		);
	}
);

const ReleaseCommentReplyAPISchema = z.object({
	replies: z.array(
		z.object({
			id: z.string().describe("Reply UUID"),
			releaseId: z.string().describe("ID of the release this reply belongs to"),
			organizationId: z.string().describe("ID of the organization this reply belongs to"),
			createdBy: z.object({
				id: z.string().describe("User ID of the author"),
				name: z.string().describe("Name of the author"),
				image: z.string().nullable().describe("Image URL of the author"),
				createdAt: z.string().describe("Timestamp when the author was created"),
			}).nullable(),
			content: z.any().describe("Content of the reply in BlockNote JSON format"),
			contentHtml: z.string().describe("Content of the reply rendered as HTML"),
			contentMarkdown: z.string().describe("Content of the reply rendered as Markdown"),
			visibility: z.enum(["public", "internal"]).describe("Visibility of the reply"),
			parentId: z.string().nullable().describe("ID of the parent comment, if this is a reply"),
			statusUpdateId: z.string().nullable().describe("ID of the status update this reply belongs to"),
			replyCount: z.number().describe("Number of replies to this comment"),
			reactions: z.object({
				total: z.number().describe("Total number of reactions"),
				reactions: z.record(
					z.string(),
					z.object({
						count: z.number().describe("Number of reactions of this type"),
						users: z.array(z.string()).describe("List of users who reacted"),
					})
				),
			}).nullable(),
			createdAt: z.string().describe("Timestamp when the reply was created"),
			updatedAt: z.string().describe("Timestamp when the reply was last updated"),
		})
	),
});
/**
 * GET /organization/:org_slug/releases/:release_slug/comments/:commentId/replies
 * Returns replies for a specific comment.
 */
apiPublicRouteV1.get(
	"/organization/:org_slug/releases/:release_slug/comments/:commentId/replies",
	describeOkNotFound({
		summary: "Get Comment Replies",
		description: "Retrieve public replies for the specified comment.",
		dataSchema: ReleaseCommentReplyAPISchema,
		tags: ["Organization"],
	}),
	async (c) => {
		const { org_slug, release_slug, commentId } = c.req.param();

		const org = await getOrganizationPublic(org_slug);
		if (!org) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		if (!org.settings?.enablePublicPage) {
			return c.json(errorResponse("Organization not available"), 404);
		}

		const release = await getReleaseBySlug(org.id, release_slug);
		if (!release) {
			return c.json(errorResponse("Release not found"), 404);
		}

		const replies = await getReleaseCommentReplies(release.id, commentId);

		// Filter to public-only replies
		const publicReplies = replies.filter((r) => r.visibility === "public");

		return c.json(
			successResponse({
				replies: publicReplies.map((r) => ({
					id: r.id,
					releaseId: r.releaseId,
					organizationId: r.organizationId,
					createdBy: r.createdBy,
					content: r.content,
					visibility: r.visibility,
					parentId: r.parentId,
					statusUpdateId: r.statusUpdateId,
					replyCount: r.replyCount ?? 0,
					reactions: r.reactions,
					createdAt: r.createdAt?.toISOString() ?? "",
					updatedAt: r.updatedAt?.toISOString() ?? "",
					contentHtml: r.content ? prosekitJSONToHTML(r.content) : "",
					contentMarkdown: r.content ? prosekitJSONToMarkdown(r.content) : "",
				})),
			})
		);
	}
);

// ME routes
apiPublicRouteV1.route("/me", apiPublicMeV1);