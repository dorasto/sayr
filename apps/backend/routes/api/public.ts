import { db, getLabels, getOrganizationPublic, getTaskByShortId, schema } from "@repo/database";
import { and, eq, sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import type { AppEnv } from "@/index";
import { describeOkNotFound, describePaginatedRoute } from "../../openapi/helpers";
import { errorResponse, paginatedSuccessResponse, successResponse } from "../../responses";
// import { prosekitJSONToHTML } from "@/prosekit/html";
// import { prosekitJSONToMarkdown } from "@/prosekit/markdown";

const API_LIMITS = {
	comments: 30,
	tasks: 50,
};
// --- API Setup ---
export const apiPublicRoute = new Hono<AppEnv>();
apiPublicRoute.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		credentials: false,
	})
);
apiPublicRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	c.header("X-Service-Name", "Sayr.io Public API");
	return next();
});

//@ts-expect-error
const OrganizationSchema = createSelectSchema(schema.organization)
	.omit({ privateId: true })
	.extend({
		createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
		updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	});
apiPublicRoute.get(
	"/organization/:org_slug",
	describeOkNotFound({
		description: "Fetch public organization data by slug",
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
		const recordWideEvent = c.get("recordWideEvent");
		const orgSlug = c.req.param("org_slug");
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			await recordWideEvent({
				name: "getOrganizationPublic",
				description: "No organization found for given slug",
				data: {
					type: "OrganizationError",
					code: "NotFound",
					message: "No organization found",
					orgSlug: orgSlug,
				},
			});
			return c.json(errorResponse("No organization found"), 404);
		}
		await recordWideEvent({
			name: "getOrganizationPublic",
			description: "Fetched public organization data by slug",
			data: {
				id: organization.id,
				slug: organization.slug,
			},
		});
		// biome-ignore lint/correctness/noUnusedVariables: <needed>
		const { privateId, ...publicOrg } = organization;
		return c.json(successResponse(publicOrg));
	}
);

//@ts-expect-error
const LabelSchema = createSelectSchema(schema.label).extend({
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
});
apiPublicRoute.get(
	"/organization/:org_slug/labels",
	describeOkNotFound({
		description: "Fetch public organization labels",
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
		const recordWideEvent = c.get("recordWideEvent");
		const orgSlug = c.req.param("org_slug");
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			await recordWideEvent({
				name: "getLabels",
				description: "No organization found for labels",
				data: {
					type: "OrganizationError",
					code: "NotFound",
					message: "No organization found for labels",
					orgSlug: orgSlug,
				},
			});
			return c.json(errorResponse("No organization found"), 404);
		}
		const labels = await getLabels(organization.id);
		await recordWideEvent({
			name: "getLabels",
			description: "Fetched public organization labels",
			data: {
				orgId: organization.id,
				slug: organization.slug,
				count: labels.length,
			},
		});
		return c.json(successResponse(labels));
	}
);

//@ts-expect-error
const CategorySchema = createSelectSchema(schema.category).extend({
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
});
apiPublicRoute.get(
	"/organization/:org_slug/categories",
	describeOkNotFound({
		description: "Fetch public organization categories",
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
				description: "Sort order for categories. Use 'asc' for oldest first, 'desc' for newest first (default).",
			},
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const recordWideEvent = c.get("recordWideEvent");
		const query = c.req.query();
		const orgSlug = c.req.param("org_slug");
		const order = query.order === "asc" ? "asc" : "desc"; // default desc if not given

		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			await recordWideEvent({
				name: "getCategories",
				description: "No organization found for categories",
				data: {
					type: "OrganizationError",
					code: "NotFound",
					message: "No organization found for categories",
					orgSlug: orgSlug,
				},
			});
			return c.json(errorResponse("No organization found"), 404);
		}
		const categories = await db.query.category.findMany({
			orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
			where: (category) => eq(category.organizationId, organization.id),
		});
		await recordWideEvent({
			name: "getCategories",
			description: "Fetched public organization categories",
			data: {
				orgId: organization.id,
				slug: organization.slug,
				count: categories.length,
			},
		});
		return c.json(successResponse(categories));
	}
);

//@ts-expect-error
const TaskSchema = createSelectSchema(schema.task).extend({
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	descriptionHtml: z.string(),
	descriptionMarkdown: z.string(),
});
apiPublicRoute.get(
	"/organization/:org_slug/tasks",
	describePaginatedRoute({
		description: "List organization tasks (paginated)",
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
				description: "Sort order for tasks. Use 'asc' for oldest first, 'desc' for newest first (default).",
			},
		],
		maxLimit: API_LIMITS.tasks,
		tags: ["Organization"],
	}),
	async (c) => {
		try {
			const recordWideEvent = c.get("recordWideEvent");
			const query = c.req.query();
			const limit = Math.min(Number(query.limit) || 5, API_LIMITS.tasks);
			const order = query.order === "asc" ? "asc" : "desc"; // default desc if not given
			const page = Math.max(Number(query.page) || 1, 1);
			const offset = (page - 1) * limit;
			const orgSlug = c.req.param("org_slug");
			const organization = await getOrganizationPublic(orgSlug);
			if (!organization) {
				await recordWideEvent({
					name: "getTasks",
					description: "No organization found for tasks",
					data: {
						type: "OrganizationError",
						code: "NotFound",
						message: "No organization found for tasks",
						orgSlug: orgSlug,
					},
				});
				return c.json(errorResponse("Organization not found"), 404);
			}
			if (Number(query.limit) > API_LIMITS.tasks) {
				await recordWideEvent({
					name: "getTasks",
					description: "Invalid limit for paginated tasks",
					data: {
						type: "PaginationError",
						code: "LimitOverflow",
						requestedLimit: Number(query.limit),
					},
				});
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.tasks}`
					),
					400
				);
			}
			const [countResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.task)
				.where(eq(schema.task.organizationId, organization.id));
			const totalItems = Number(countResult?.count ?? 0);
			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
			if (page > totalPages && totalItems > 0) {
				await recordWideEvent({
					name: "getTasks",
					description: "Page overflow for paginated tasks",
					data: {
						type: "PaginationError",
						code: "PageOverflow",
						requestedPage: page,
						totalPages,
					},
				});
				return c.json(errorResponse(`Page ${page} not found`, `Valid pages range from 1 to ${totalPages}`), 400);
			}
			const tasks = await db.query.task.findMany({
				orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
				where: (t) => eq(t.organizationId, organization.id),
				limit,
				offset,
				with: {
					createdBy: { columns: { name: true, image: true } },
					category: { columns: { id: true, name: true } },
				},
			});
			const tasksNew = tasks.map((t) => ({
				...t,
				// descriptionHtml: t.description && prosekitJSONToHTML(t.description),
				// descriptionMarkdown: t.description && prosekitJSONToMarkdown(t.description),
			}));
			await recordWideEvent({
				name: "getTasks",
				description: "Fetched public organization tasks (paginated)",
				data: {
					orgId: organization.id,
					slug: organization.slug,
					page,
					limit,
					totalPages,
					totalItems,
					taskCount: tasks.length,
				},
			});
			return c.json(
				paginatedSuccessResponse(tasksNew, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				})
			);
		} catch (error) {
			console.error("🚀 Pagination Error:", error);
			return c.json(errorResponse("Database error", "Unexpected error"), 500);
		}
	}
);

apiPublicRoute.get(
	"/organization/:org_slug/tasks/:task_short_id",
	describeOkNotFound({
		description: "Fetch public task data",
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
		const recordWideEvent = c.get("recordWideEvent");
		const orgSlug = c.req.param("org_slug");
		const taskShortIdRaw = c.req.param("task_short_id");
		const taskShortId = Number(taskShortIdRaw);
		if (Number.isNaN(taskShortId)) {
			await recordWideEvent({
				name: "getTaskByShortId",
				description: "Invalid task_short_id, must be a number",
				data: {
					type: "TaskError",
					code: "InvalidID",
					taskShortIdRaw,
				},
			});
			return c.json(errorResponse("Invalid task_short_id", "Must be a number"), 400);
		}
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			await recordWideEvent({
				name: "getTaskByShortId",
				description: "No organization found for tasks",
				data: {
					type: "OrganizationError",
					code: "NotFound",
					orgSlug,
				},
			});
			return c.json(errorResponse("No organization found"), 404);
		}
		const task = await getTaskByShortId(organization.id, taskShortId);
		if (!task) {
			await recordWideEvent({
				name: "getTaskByShortId",
				description: "Task not found",
				data: {
					type: "TaskError",
					code: "NotFound",
					orgId: organization.id,
					taskShortId,
				},
			});
			return c.json(errorResponse("No Task found"), 404);
		}
		await recordWideEvent({
			name: "getTaskByShortId",
			description: "Fetched public task data",
			data: {
				orgId: organization.id,
				orgSlug: organization.slug,
				taskId: task.id,
				shortId: task.shortId,
			},
		});
		return c.json(
			successResponse({
				...task,
				// descriptionHtml: task.description && prosekitJSONToHTML(task.description),
				// descriptionMarkdown: task.description && prosekitJSONToMarkdown(task.description),
			})
		);
	}
);

//@ts-expect-error
const CommentSchema = createSelectSchema(schema.taskComment).extend({
	createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
	createdBy: z
		.object({
			name: z.string().nullable(),
			image: z.string().nullable(),
		})
		.nullable()
		.optional(),
	descriptionHtml: z.string(),
	descriptionMarkdown: z.string(),
});
apiPublicRoute.get(
	"/organization/:org_slug/tasks/:task_short_id/comments",
	describePaginatedRoute({
		description: "List comments for a public task (paginated)",
		dataSchema: CommentSchema, // Zod schema for your `taskComment` table
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
				description: "Sort order for comments. Use 'asc' for oldest first, 'desc' for newest first (default).",
			},
		],
		maxLimit: API_LIMITS.comments,
		tags: ["Organization"],
	}),
	async (c) => {
		try {
			const recordWideEvent = c.get("recordWideEvent");
			const query = c.req.query();
			const limit = Math.min(Number(query.limit) || 5, API_LIMITS.comments);
			const page = Math.max(Number(query.page) || 1, 1);
			const order = query.order === "asc" ? "asc" : "desc"; // default desc if not given
			const offset = (page - 1) * limit;
			const orgSlug = c.req.param("org_slug");
			const taskShortIdRaw = c.req.param("task_short_id");
			const taskShortId = Number(taskShortIdRaw);
			if (Number.isNaN(taskShortId)) {
				await recordWideEvent({
					name: "getComments",
					description: "Invalid task_short_id, must be a number",
					data: {
						type: "TaskError",
						code: "InvalidID",
						taskShortIdRaw,
					},
				});
				return c.json(errorResponse("Invalid task_short_id", "Must be a number"), 400);
			}
			const org = await getOrganizationPublic(orgSlug);
			if (!org) {
				await recordWideEvent({
					name: "getComments",
					description: "No organization found for tasks",
					data: {
						type: "OrganizationError",
						code: "NotFound",
						orgSlug,
					},
				});
				return c.json(errorResponse("Organization not found"), 404);
			}
			const task = await getTaskByShortId(org.id, taskShortId);
			if (!task) {
				await recordWideEvent({
					name: "getComments",
					description: "Task not found for comments query",
					data: {
						type: "TaskError",
						code: "NotFound",
						orgId: org.id,
						taskShortId,
					},
				});
				return c.json(errorResponse("Task not found"), 404);
			}
			if (Number(query.limit) > API_LIMITS.comments) {
				await recordWideEvent({
					name: "getComments",
					description: "Limit overflow on comments pagination",
					data: {
						type: "PaginationError",
						code: "LimitOverflow",
						requestedLimit: Number(query.limit),
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
			const [countResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.taskComment)
				.where(
					and(
						eq(schema.taskComment.taskId, task.id),
						eq(schema.taskComment.organizationId, org.id),
						eq(schema.taskComment.visibility, "public")
					)
				);
			const totalItems = Number(countResult?.count ?? 0);
			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
			if (page > totalPages && totalItems > 0) {
				await recordWideEvent({
					name: "getComments",
					description: "Page overflow on comments pagination",
					data: {
						type: "PaginationError",
						code: "PageOverflow",
						requestedPage: page,
						totalPages,
					},
				});
				return c.json(errorResponse(`Page ${page} not found`, `Valid pages range from 1 to ${totalPages}`), 400);
			}
			const comments = await db.query.taskComment.findMany({
				where: (tC) =>
					and(eq(tC.taskId, task.id), eq(tC.organizationId, org.id), eq(schema.taskComment.visibility, "public")),
				orderBy: (tC, { asc, desc }) => (order === "asc" ? asc(tC.createdAt) : desc(tC.createdAt)),
				limit,
				offset,
				with: {
					createdBy: {
						columns: {
							name: true,
							image: true,
						},
					},
				},
			});
			await recordWideEvent({
				name: "getComments",
				description: "Fetched comments for public task (paginated)",
				data: {
					orgId: org.id,
					orgSlug: org.slug,
					taskId: task.id,
					totalItems,
					limit,
					page,
				},
			});
			const commentsNew = comments.map((c) => ({
				...c,
				// contentHtml: c.content && prosekitJSONToHTML(c.content),
				// contentMarkdown: c.content && prosekitJSONToMarkdown(c.content),
			}));

			return c.json(
				paginatedSuccessResponse(commentsNew, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				})
			);
		} catch (error) {
			console.error("🚀 Comments Pagination Error:", error);
			return c.json(errorResponse("Database error", "Unexpected error"), 500);
		}
	}
);
