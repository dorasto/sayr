import {
	db,
	getLabels,
	getOrganizationPublic,
	getTaskByShortId,
	schema,
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
} from "../../openapi/helpers";
import {
	errorResponse,
	paginatedSuccessResponse,
	successResponse,
} from "../../responses";

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
	}),
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
		createdAt: z.preprocess(
			(v) => (v instanceof Date ? v.toISOString() : v),
			z.string(),
		),
		updatedAt: z.preprocess(
			(v) => (v instanceof Date ? v.toISOString() : v),
			z.string(),
		),
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
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Fetch public organization data by slug";
		wideEvent.service = "sayr-public-api";
		const orgSlug = c.req.param("org_slug");
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			wideEvent.error = {
				type: "OrganizationError",
				code: "NotFound",
				message: "No organization found",
				orgSlug: orgSlug,
			};
			return c.json(errorResponse("No organization found"), 404);
		}
		wideEvent.organization = {
			id: organization.id,
			slug: organization.slug,
		};
		// biome-ignore lint/correctness/noUnusedVariables: <needed>
		const { privateId, ...publicOrg } = organization;
		return c.json(successResponse(publicOrg));
	},
);

//@ts-expect-error
const LabelSchema = createSelectSchema(schema.label).extend({
	createdAt: z.preprocess(
		(v) => (v instanceof Date ? v.toISOString() : v),
		z.string(),
	),
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
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Fetch public organization labels";
		wideEvent.service = "sayr-public-api";
		const orgSlug = c.req.param("org_slug");
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			wideEvent.error = {
				type: "OrganizationError",
				code: "NotFound",
				message: "No organization found for labels",
				orgSlug: orgSlug,
			};
			return c.json(errorResponse("No organization found"), 404);
		}
		const labels = await getLabels(organization.id);
		wideEvent.organization = {
			id: organization.id,
			slug: organization.slug,
		};
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
		],
		tags: ["Organization"],
	}),
	async (c) => {
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Fetch public organization categories";
		wideEvent.service = "sayr-public-api";
		const orgSlug = c.req.param("org_slug");
		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			wideEvent.error = {
				type: "OrganizationError",
				code: "NotFound",
				message: "No organization found for labels",
				orgSlug: orgSlug,
			};
			return c.json(errorResponse("No organization found"), 404);
		}
		const categories = await db.query.category.findMany({
			where: (category) => eq(category.organizationId, organization.id),
		});
		wideEvent.organization = {
			id: organization.id,
			slug: organization.slug,
		};
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
		],
		maxLimit: API_LIMITS.tasks,
		tags: ["Organization"],
	}),
	async (c) => {
		try {
			const wideEvent = c.get("wideEvent");
			wideEvent.description = "List public organization tasks (paginated)";
			wideEvent.service = "sayr-public-api";
			// --- Query + Params ---
			const query = c.req.query();
			const limit = Math.min(Number(query.limit) || 5, API_LIMITS.tasks);
			const page = Math.max(Number(query.page) || 1, 1);

			const offset = (page - 1) * limit;

			const orgSlug = c.req.param("org_slug");
			const organization = await getOrganizationPublic(orgSlug);
			if (!organization) {
				wideEvent.error = {
					type: "OrganizationError",
					code: "NotFound",
					message: "No organization found for tasks",
					orgSlug: orgSlug,
				};
				return c.json(errorResponse("Organization not found"), 404);
			}

			// ---- CHECK: limit overflow ----
			if (Number(query.limit) > API_LIMITS.tasks) {
				wideEvent.error = {
					type: "PaginationError",
					code: "LimitOverflow",
					message: `Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.tasks}`,
					requestedLimit: Number(query.limit),
				};
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.tasks}`,
					),
					400,
				);
			}

			// --- Total count ---
			const [countResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.task)
				.where(eq(schema.task.organizationId, organization.id));

			const totalItems = Number(countResult?.count ?? 0);
			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

			// ---- CHECK: page overflow ----
			if (page > totalPages && totalItems > 0) {
				wideEvent.error = {
					type: "PaginationError",
					code: "PageOverflow",
					message: `Valid pages range from 1 to ${totalPages}`,
					requestedPage: page,
				};
				return c.json(
					errorResponse(
						`Page ${page} not found`,
						`Valid pages range from 1 to ${totalPages}`,
					),
					400,
				);
			}

			// --- Fetch tasks using Drizzle ---
			const tasks = await db.query.task.findMany({
				orderBy: (t, { desc }) => desc(t.createdAt),
				where: (t) => eq(t.organizationId, organization.id),
				limit,
				offset,
				with: {
					createdBy: { columns: { name: true, image: true } },
					category: { columns: { id: true, name: true } },
				},
			});
			wideEvent.organization = {
				id: organization.id,
				slug: organization.slug,
			};
			wideEvent.pagination = {
				limit,
				page,
				totalPages,
				totalItems,
			};
			// --- Response payload ---
			return c.json(
				paginatedSuccessResponse(tasks, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				}),
			);
		} catch (error) {
			// --- Safe error handler ---
			console.error("🚀 Pagination Error:", error);

			let readableError = "Database error";
			let detailedMessage = "Unexpected error";

			try {
				const parsed = JSON.parse((error as Error).message);
				readableError =
					(Array.isArray(parsed) ? parsed[0]?.message : parsed?.message) ??
					readableError;
				detailedMessage =
					(Array.isArray(parsed)
						? parsed[0]?.detail || parsed[0]?.hint || parsed[0]?.message
						: parsed?.detail || parsed?.message) ?? detailedMessage;
			} catch {
				readableError =
					(error as Error)?.message ||
					(typeof error === "string" ? error : "Unknown error");
				detailedMessage = readableError;
			}
			return c.json(errorResponse(readableError, detailedMessage), 500);
		}
	},
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
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Fetch public task data";
		wideEvent.service = "sayr-public-api";
		const orgSlug = c.req.param("org_slug");
		const taskShortIdRaw = c.req.param("task_short_id");
		const taskShortId = Number(taskShortIdRaw);

		if (Number.isNaN(taskShortId)) {
			wideEvent.error = {
				type: "TaskError",
				code: "InvalidID",
				message: "Invalid task_short_id, must be a number",
				taskShortId: taskShortIdRaw,
			};
			return c.json(
				errorResponse("Invalid task_short_id", "Must be a number"),
				400,
			);
		}

		const organization = await getOrganizationPublic(orgSlug);
		if (!organization) {
			wideEvent.error = {
				type: "OrganizationError",
				code: "NotFound",
				message: "No organization found for tasks",
				orgSlug: orgSlug,
			};
			return c.json(errorResponse("No organization found"), 404);
		}

		const task = await getTaskByShortId(organization.id, taskShortId);
		if (!task) {
			wideEvent.error = {
				type: "TaskError",
				code: "NotFound",
				message: "No Task found",
				taskShortId: taskShortId,
			};
			return c.json(errorResponse("No Task found"), 404);
		}
		wideEvent.organization = {
			id: organization.id,
			slug: organization.slug,
		};
		wideEvent.task = {
			id: task.id,
			shortId: task.shortId,
		};
		return c.json(successResponse(task));
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
		],
		maxLimit: API_LIMITS.comments,
		tags: ["Organization"],
	}),
	async (c) => {
		try {
			const wideEvent = c.get("wideEvent");
			wideEvent.description = "List comments for a public task (paginated)";
			wideEvent.service = "sayr-public-api";
			const query = c.req.query();
			const limit = Math.min(Number(query.limit) || 5, API_LIMITS.comments);
			const page = Math.max(Number(query.page) || 1, 1);
			const offset = (page - 1) * limit;

			const orgSlug = c.req.param("org_slug");
			const taskShortIdRaw = c.req.param("task_short_id");
			const taskShortId = Number(taskShortIdRaw);

			if (Number.isNaN(taskShortId)) {
				wideEvent.error = {
					type: "TaskError",
					code: "InvalidID",
					message: "Invalid task_short_id, must be a number",
					taskShortId: taskShortIdRaw,
				};
				return c.json(
					errorResponse("Invalid task_short_id", "Must be a number"),
					400,
				);
			}

			// --- Get org ---
			const org = await getOrganizationPublic(orgSlug);
			if (!org) {
				wideEvent.error = {
					type: "OrganizationError",
					code: "NotFound",
					message: "No organization found for tasks",
					orgSlug: orgSlug,
				};
				return c.json(errorResponse("Organization not found"), 404);
			}

			// --- Get task ---
			const task = await getTaskByShortId(org.id, taskShortId);
			if (!task) {
				wideEvent.error = {
					type: "TaskError",
					code: "NotFound",
					message: "No Task found",
					taskShortId: taskShortId,
				};
				return c.json(errorResponse("Task not found"), 404);
			}

			// ---- CHECK: limit overflow ----
			if (Number(query.limit) > API_LIMITS.comments) {
				wideEvent.error = {
					type: "PaginationError",
					code: "LimitOverflow",
					message: `Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.comments}`,
					requestedLimit: Number(query.limit),
				};
				return c.json(
					errorResponse(
						"Invalid limit",
						`Query parameter \`limit\` must be an integer between 1 and ${API_LIMITS.comments}`,
					),
					400,
				);
			}

			// --- Total count of comments ---
			const [countResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.taskComment)
				.where(
					and(
						eq(schema.taskComment.taskId, task.id),
						eq(schema.taskComment.organizationId, org.id),
						eq(schema.taskComment.visibility, "public"),
					),
				);

			const totalItems = Number(countResult?.count ?? 0);
			const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

			// ---- CHECK: page overflow ----
			if (page > totalPages && totalItems > 0) {
				wideEvent.error = {
					type: "PaginationError",
					code: "PageOverflow",
					message: `Valid pages range from 1 to ${totalPages}`,
					requestedPage: page,
				};
				return c.json(
					errorResponse(
						`Page ${page} not found`,
						`Valid pages range from 1 to ${totalPages}`,
					),
					400,
				);
			}

			// --- Fetch comments ---
			const comments = await db.query.taskComment.findMany({
				where: (tC) =>
					and(
						eq(tC.taskId, task.id),
						eq(tC.organizationId, org.id),
						eq(schema.taskComment.visibility, "public"),
					),
				orderBy: (tC, { desc }) => desc(tC.createdAt),
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
			wideEvent.organization = {
				id: org.id,
				slug: org.slug,
			};
			wideEvent.task = {
				id: task.id,
				shortId: task.shortId,
			};
			wideEvent.pagination = {
				limit,
				page,
				totalPages,
				totalItems,
			};
			// --- Response payload ---
			return c.json(
				paginatedSuccessResponse(comments, {
					limit,
					page,
					totalPages,
					totalItems,
					hasMore: page < totalPages,
				}),
			);
		} catch (error) {
			console.error("🚀 Comments Pagination Error:", error);

			let readableError = "Database error";
			let detailedMessage = "Unexpected error";

			try {
				const parsed = JSON.parse((error as Error).message);
				readableError =
					(Array.isArray(parsed) ? parsed[0]?.message : parsed?.message) ??
					readableError;
				detailedMessage =
					(Array.isArray(parsed)
						? parsed[0]?.detail || parsed[0]?.hint || parsed[0]?.message
						: parsed?.detail || parsed?.message) ?? detailedMessage;
			} catch {
				readableError =
					(error as Error)?.message ||
					(typeof error === "string" ? error : "Unknown error");
				detailedMessage = readableError;
			}

			return c.json(errorResponse(readableError, detailedMessage), 500);
		}
	},
);
