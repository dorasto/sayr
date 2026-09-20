import {
	addLogEventTask,
	createTask,
	db,
	getOrganizationMembers,
	getTaskById,
	getTaskComments,
	schema,
} from "@repo/database";
import { isAiEnabled } from "@repo/edition";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { prosekitJSONToHTML } from "@/prosekit/html";
import { prosekitJSONToMarkdown } from "@/prosekit/markdown";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import {
	findSSEClientsByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";
import { checkTaskSummaryAccess, getTaskAiSummary } from "../../../../../lib/ai/task-summary";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId, resolveReleaseId, resolveTaskId } from "../../../../../lib/apiRefs";
import { updateTaskService } from "../../../../../lib/tasks/updateTask";
import {
	TaskNotFoundError as AssigneesTaskNotFoundError,
	updateTaskAssigneesService,
} from "../../../../../lib/tasks/updateTaskAssignees";
import {
	TaskNotFoundError as LabelsTaskNotFoundError,
	updateTaskLabelsService,
} from "../../../../../lib/tasks/updateTaskLabels";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, paginatedSuccessResponse, successResponse } from "../../../../../responses";
import { baseTaskWhere } from "../../../internal/v1/task";
import { CommentSchema, CreatedBySchema, parsePaginationParam, resolveActorId, TaskSchema } from "./schemas";

const COMMENTS_MAX_LIMIT = 30;

export const tasksRoute = new Hono<AppEnv>();

const RELEASE_NOT_FOUND = errorResponse("Release not found", 'Pass the release slug (e.g. "v1.2.0") or its id.');

type TaskReleaseRef =
	| { ok: true; releaseId: string | null }
	| { ok: false; status: 400 | 404; body: ReturnType<typeof errorResponse> };

/**
 * Resolves the `releaseId` a caller sent (a release slug or id) to a release id
 * in `orgId`. `null` means "no release" and passes through, so callers can
 * clear a task's release. Anything else that isn't a non-empty string is
 * rejected up front instead of reaching the database as a foreign-key error.
 */
async function resolveTaskReleaseRef(orgId: string, ref: unknown): Promise<TaskReleaseRef> {
	if (ref === null) return { ok: true, releaseId: null };

	if (typeof ref !== "string" || !ref.trim()) {
		return {
			ok: false,
			status: 400,
			body: errorResponse(
				"Invalid release",
				"releaseId must be a release slug or id, or null to remove the task from its release."
			),
		};
	}

	const releaseId = await resolveReleaseId(orgId, ref);
	if (!releaseId) return { ok: false, status: 404, body: RELEASE_NOT_FOUND };

	return { ok: true, releaseId };
}

export const CreateTaskSchema = {
	type: "object",
	required: ["title", "orgId"],
	properties: {
		title: { type: "string", minLength: 1 },
		description: { type: "string" },
		status: {
			type: "string",
			enum: ["backlog", "todo", "in-progress", "done", "canceled"],
		},
		priority: {
			type: "string",
			enum: ["none", "low", "medium", "high", "urgent"],
		},
		category: { type: "string" },
		releaseId: {
			type: "string",
			description: 'Release slug (e.g. "v1.2.0") or release id. The task is created in this release.',
		},
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		integration: {
			oneOf: [
				{
					type: "object",
					required: ["id", "name", "platform"],
					properties: {
						id: { type: "string" },
						name: { type: "string" },
						platform: { type: "string" },
					},
				},
				{ type: "null" },
			],
		},
		createdBy: CreatedBySchema,
	},
};

const CreateTaskSchemaData = z.object({
	id: z.string(),
	title: z.string(),
	shortId: z.string(),
	orgSlug: z.string(),
	publicPortalUrl: z.string(),
});

tasksRoute.post(
	"/task",
	describeOkNotFound({
		summary: "Create Task",
		description: "Create a new task in the organization.",
		dataSchema: CreateTaskSchemaData,
		bodySchema: CreateTaskSchema,
		bodyExample: {
			title: "My Task",
			description: "Task description",
			orgId: "platform",
		},
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const {
			orgId: orgRef,
			title,
			description,
			status,
			priority,
			category,
			releaseId: releaseRef,
			integration,
			createdBy,
		} = body;

		// Accept a slug ("platform") or an id, so callers can use what the UI shows them.
		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const { userId, invalidProvider } = await resolveActorId(createdBy, principal.userId, orgId);
		if (invalidProvider) {
			return c.json(errorResponse("Invalid CreatedBy type", "The provided CreatedBy type is invalid"), 400);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.create");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to create tasks.",
					"Your API key or your role in this organization doesn't allow creating tasks."
				),
				403
			);
		}

		// Optional: put the new task straight into a release (slug or id, resolved
		// within this organization — a release from another org is a 404).
		let releaseId: string | null = null;
		if (releaseRef !== undefined && releaseRef !== null) {
			const resolved = await resolveTaskReleaseRef(orgId, releaseRef);
			if (!resolved.ok) return c.json(resolved.body, resolved.status);
			releaseId = resolved.releaseId;
		}

		const descriptionProsekit = description ? markdownToProsekitJSON(description) : undefined;
		const task = await traceAsync(
			"task.create.insert",
			() =>
				createTask(
					orgId,
					{
						title,
						description: descriptionProsekit,
						status,
						priority,
						category,
						releaseId,
						visible: "public",
						parentId: null,
					},
					userId
				),
			{
				description: "Creating task record",
				data: { orgId, title, status, priority, category, releaseId },
			}
		);

		if (!task) {
			return c.json(errorResponse("Failed to create task", "An error occurred while creating the task"), 500);
		}

		// Add integration timeline event first if integration info provided
		if (integration) {
			await traceAsync(
				"task.create.timeline.integration",
				() => addLogEventTask(task.id, orgId, "integration", null, { ...integration, createdBy }, userId),
				{ description: "Adding integration timeline event" }
			);
		}

		// Add created timeline event
		await traceAsync(
			"task.create.timeline",
			() =>
				addLogEventTask(
					task.id,
					orgId,
					"created",
					null,
					{ status, priority, title, labels: [], assignees: [] },
					userId,
					descriptionProsekit
				),
			{ description: "Adding created timeline event" }
		);

		const taskWithData = await traceAsync("task.me.refetch", () => getTaskById(orgId, task.id), {
			description: "Fetching created public task with relations",
		});

		await traceAsync(
			"task.public_create.broadcast",
			async () => {
				const data = {
					type: "CREATE_TASK" as ServerEventBaseMessage["type"],
					data: taskWithData,
				};

				sseBroadcastToRoom(orgId, "tasks", data);
				sseBroadcastPublic(orgId, { ...data, data: data });

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findSSEClientsByUserId(member.userId);
					clients.forEach((client) => client.channel !== "tasks" && sseBroadcastIndividual(client, data, orgId));
				});
			},
			{ description: "Broadcasting new public task to clients" }
		);

		const organization = await db.query.organization.findFirst({
			columns: { id: true, slug: true },
			where: (org) => eq(org.id, orgId),
		});

		return c.json(
			successResponse({
				id: task.id,
				shortId: task.shortId,
				title: task.title,
				orgSlug: organization?.slug,
				publicPortalUrl: `${process.env.APP_ENV === "development" ? `http://${organization?.slug}.${process.env.VITE_ROOT_DOMAIN}:3000` : `https://${organization?.slug}.${process.env.VITE_ROOT_DOMAIN}`}/${task.shortId}`,
			})
		);
	}
);

const CreateTimelineEventSchema = {
	type: "object",
	required: ["taskId", "orgId", "type", "id", "name"],
	properties: {
		taskId: {
			type: "string",
			description: 'Task short id (the number in SAY-123, e.g. "123") or task id.',
		},
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		type: { type: "string" },
		id: { type: "string" },
		name: { type: "string" },
		data: { type: "object" },
		createdBy: CreatedBySchema,
	},
};

const CreateTimelineEventSchemaData = z.object({
	id: z.string(),
});

tasksRoute.post(
	"/timeline_event",
	describeOkNotFound({
		summary: "Create Timeline Event",
		description: "Create a new timeline event for a task.",
		dataSchema: CreateTimelineEventSchemaData,
		bodySchema: CreateTimelineEventSchema,
		bodyExample: {
			taskId: "123",
			orgId: "platform",
			type: "sidebar",
			id: "integrationId",
			name: "Integration Name",
			data: {},
		},
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const { taskId: taskRef, orgId: orgRef, type, id, name, data, createdBy } = body;

		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const { userId, invalidProvider } = await resolveActorId(createdBy, principal.userId, orgId);
		if (invalidProvider) {
			return c.json(errorResponse("Invalid CreatedBy type", "The provided CreatedBy type is invalid"), 400);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.create");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to create tasks.",
					"Your API key or your role in this organization doesn't allow this."
				),
				403
			);
		}

		// Accept a task short id (the number shown in SAY-123) or a task id.
		const taskId = await resolveTaskId(orgId, taskRef);
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		const task = await traceAsync(
			"public.me.task.activity.task_lookup",
			() => db.query.task.findFirst({ where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)) }),
			{ description: "Finding task for activity", data: { orgId, taskId } }
		);

		if (!task) {
			return c.json(errorResponse("Task not found", "No task found with the provided ID in the organization"), 404);
		}

		const value = { id, name, data };
		const activity = await traceAsync(
			"public.me.task.activity.insert",
			() => addLogEventTask(taskId, orgId, "integration", type, value ?? null, userId),
			{ description: "Creating task timeline activity", data: { orgId, taskId, type: "integration", value } }
		);

		await traceAsync(
			"public.me.task.activity.broadcast",
			async () => {
				const taskWithData = await getTaskById(orgId, taskId);

				const message = {
					type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
					data: taskWithData,
				};

				sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, message, undefined, true);

				if (taskWithData?.visible === "public") {
					sseBroadcastPublic(orgId, { ...message });
				}

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findSSEClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
							sseBroadcastIndividual(client, message, orgId)
					);
				});
			},
			{ description: "Broadcasting task activity to clients" }
		);

		return c.json(successResponse({ id: activity?.id }));
	}
);

/* -------------------------------------------------------------------------- */
/*                    Task parity: list / read / write                        */
/* -------------------------------------------------------------------------- */

const ListTasksSchemaData = z.array(TaskSchema);

tasksRoute.get(
	"/tasks",
	describeOkNotFound({
		summary: "List Tasks",
		description:
			"List tasks in an organization you're a member of. Unlike the unauthenticated /v1/organization/:slug/tasks endpoint, this always includes both public and private tasks — never degrades to a public-only view.",
		dataSchema: ListTasksSchemaData,
		parameters: [
			{
				name: "orgId",
				in: "query",
				required: true,
				schema: { type: "string" },
				description: 'Organization slug (e.g. "platform") or organization id.',
			},
			{ name: "q", in: "query", schema: { type: "string" }, description: "Search query." },
			{ name: "categoryId", in: "query", schema: { type: "string" } },
			{
				name: "releaseId",
				in: "query",
				schema: { type: "string" },
				description: 'Only tasks in this release: a release slug (e.g. "v1.2.0") or release id.',
			},
			{ name: "includeClosed", in: "query", schema: { type: "boolean" } },
			{ name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
			{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 30 } },
			{ name: "sortBy", in: "query", schema: { type: "string", enum: ["newest", "trending", "mostPopular"] } },
		],
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const query = c.req.query();
		const orgId = await resolveOrganizationId(query.orgId);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		// Membership only — an unauthorized caller gets a clean 403 here rather
		// than silently degrading to a public-only view (that's what the
		// unauthenticated /v1/organization/:slug/tasks endpoint is for).
		const isAuthorized = await assertApiAccess(c, orgId, "tasks.read");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to read tasks.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const sortBy =
			query.sortBy === "newest" || query.sortBy === "trending" || query.sortBy === "mostPopular"
				? query.sortBy
				: "mostPopular";
		const searchQuery = typeof query.q === "string" && query.q.trim().length > 0 ? query.q.trim() : undefined;
		const categoryId = query.categoryId;
		const includeClosed = query.includeClosed === "true";
		const page = Math.max(Number(query.page) || 1, 1);
		const requestedLimit = Number(query.limit);
		const limit = Math.min(requestedLimit || 30, 30);
		const offset = (page - 1) * limit;

		// Optional release filter (slug or id). Resolved within this organization, so
		// another org's release is a 404 rather than an empty list.
		let releaseFilter: string | undefined;
		if (typeof query.releaseId === "string" && query.releaseId.trim()) {
			const releaseId = await resolveReleaseId(orgId, query.releaseId);
			if (!releaseId) return c.json(RELEASE_NOT_FOUND, 404);
			releaseFilter = releaseId;
		}

		// Caller is a verified member at this point, so always query without the
		// public-only visibility filter — members see public + private, same as
		// the internal route does for members (`isPublic: false`).
		const baseWhere = baseTaskWhere(orgId, categoryId, searchQuery, includeClosed, false);
		const where = releaseFilter ? and(baseWhere, eq(schema.task.releaseId, releaseFilter)) : baseWhere;

		const totalItems = await traceAsync(
			"me.tasks.count",
			async () => {
				const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.task).where(where);

				return Number(result?.count ?? 0);
			},
			{ description: "Counting tasks for organization", data: { orgId } }
		);
		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
		const isTrending = sortBy === "trending";

		const rows = await traceAsync(
			"me.tasks.fetch",
			async () =>
				db.query.task.findMany({
					where,
					// Exclude the 1024-dim pgvector embedding — this list response has
					// no consumer that needs it (unlike getTaskById, used by similarity
					// search elsewhere), so there's no reason to fetch or ship it here.
					columns: { embedding: false },
					orderBy: isTrending
						? undefined
						: (t, { desc }) => {
								if (sortBy === "newest") {
									return [desc(t.createdAt)];
								}
								return [desc(t.voteCount), desc(t.createdAt)];
							},
					limit: isTrending ? limit * 5 : limit,
					offset: isTrending ? 0 : offset,
					with: {
						labels: { with: { label: true } },
						createdBy: { columns: { id: true, name: true, image: true } },
						assignees: { with: { user: { columns: { id: true, name: true, image: true } } } },
						comments: { columns: { id: true, visibility: true } },
						githubIssue: true,
					},
				}),
			{ description: "Fetching tasks with relations", data: { orgId, sortBy, limit, offset } }
		);

		const tasks = await traceAsync(
			"me.tasks.sort",
			async () => {
				let normalized = rows.map((task) => ({
					...task,
					labels: task.labels.map((l) => l.label).filter((l) => l.visible === "public"),
					assignees: task.assignees.map((a) => a.user),
					comments: task.comments?.filter((c) => c.visibility === "public"),
				}));

				if (!isTrending) {
					return normalized;
				}

				// Trending sort, app-layer only — mirrors the internal route exactly.
				const now = Date.now();

				normalized = normalized.sort((a, b) => {
					const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
					const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

					const aHours = Math.max((now - aDate) / 36e5, 0);
					const bHours = Math.max((now - bDate) / 36e5, 0);

					const aActivity = (a.voteCount ?? 0) + (a.comments?.length ?? 0);
					const bActivity = (b.voteCount ?? 0) + (b.comments?.length ?? 0);

					const aScore = aActivity / (aHours + 2) ** 1.5;
					const bScore = bActivity / (bHours + 2) ** 1.5;

					if (bScore !== aScore) {
						return bScore - aScore;
					}

					return bDate - aDate;
				});

				return normalized.slice(offset, offset + limit);
			},
			{ description: "Sorting tasks", data: { sortBy, page, limit } }
		);

		return c.json(
			paginatedSuccessResponse(tasks, {
				limit,
				page,
				totalPages,
				totalItems,
				hasMore: page < totalPages,
			}),
			200
		);
	}
);

tasksRoute.get(
	"/tasks/:taskId",
	describeOkNotFound({
		summary: "Get Task",
		description: "Get a single task by short id or id. Requires org membership.",
		dataSchema: TaskSchema,
		parameters: [
			{
				name: "taskId",
				in: "path",
				required: true,
				schema: { type: "string" },
				description: 'Task short id (the number in SAY-123, e.g. "123") or task id.',
			},
			{
				name: "orgId",
				in: "query",
				required: true,
				schema: { type: "string" },
				description: 'Organization slug (e.g. "platform") or organization id.',
			},
		],
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const recordWideError = c.get("recordWideError");
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const orgId = await resolveOrganizationId(c.req.query("orgId"));
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.read");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to read tasks.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, c.req.param("taskId"));
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		const task = await getTaskById(orgId, taskId);
		if (!task) {
			return c.json(errorResponse("Task not found", "No task found with the provided id in the organization"), 404);
		}

		// `embedding` is a 1024-dim pgvector used only for internal similarity
		// search (see recommendations.ts) — never meant to leave the API.
		// biome-ignore lint/correctness/noUnusedVariables: destructured only to strip it from the response
		const { embedding, ...taskWithoutEmbedding } = task;

		// Best-effort: an unavailable/disallowed/never-generated summary just
		// omits the field rather than failing the whole task fetch — unlike the
		// dedicated internal task-summary-status endpoint, this route's job is
		// "get the task," not "get the summary." A DB/Redis failure inside this
		// flow must not fail the task fetch either.
		let aiSummary: Awaited<ReturnType<typeof getTaskAiSummary>> | null = null;
		if (isAiEnabled()) {
			try {
				const access = await checkTaskSummaryAccess(orgId, principal.userId);
				if (access.ok) {
					aiSummary = await getTaskAiSummary(orgId, taskId);
				}
			} catch (err) {
				await recordWideError({
					name: "task.aiSummary.fetch.failed",
					error: err,
					code: "TASK_AI_SUMMARY_FETCH_FAILED",
					message: "Failed to fetch AI summary for task",
					contextData: { orgId, taskId },
				});
				aiSummary = null;
			}
		}

		return c.json(successResponse({ ...taskWithoutEmbedding, aiSummary }));
	}
);

tasksRoute.get(
	"/tasks/:taskId/comments",
	describeOkNotFound({
		summary: "List Task Comments",
		description:
			"List top-level comments on a task, with reply-thread metadata (paginated). Requires org membership — unlike the unauthenticated /v1/organization/:slug/tasks/:task_short_id/comments endpoint, this includes both public and internal-visibility comments, matching what a member sees in the app.",
		dataSchema: z.array(CommentSchema),
		parameters: [
			{
				name: "taskId",
				in: "path",
				required: true,
				schema: { type: "string" },
				description: 'Task short id (the number in SAY-123, e.g. "123") or task id.',
			},
			{
				name: "orgId",
				in: "query",
				required: true,
				schema: { type: "string" },
				description: 'Organization slug (e.g. "platform") or organization id.',
			},
			{ name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
			{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: COMMENTS_MAX_LIMIT } },
		],
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const orgId = await resolveOrganizationId(c.req.query("orgId"));
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.read");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to read tasks.",
					"Your API key or your role in this organization doesn't allow reading tasks."
				),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, c.req.param("taskId"));
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		const task = await db.query.task.findFirst({
			where: (t) => and(eq(t.organizationId, orgId), eq(t.id, taskId)),
			columns: { id: true },
		});
		if (!task) {
			return c.json(errorResponse("Task not found", "No task found with the provided id in the organization"), 404);
		}

		const query = c.req.query();
		const pageParam = parsePaginationParam(query.page, "page");
		if (pageParam.error) {
			return c.json(errorResponse("Invalid page", pageParam.error), 400);
		}
		const limitParam = parsePaginationParam(query.limit, "limit");
		if (limitParam.error) {
			return c.json(errorResponse("Invalid limit", limitParam.error), 400);
		}
		const page = pageParam.value ?? 1;
		const limit = Math.min(limitParam.value ?? 10, COMMENTS_MAX_LIMIT);
		const offset = (page - 1) * limit;

		const result = await getTaskComments(orgId, taskId, { offset, limit });
		const comments = (result?.comments ?? []).map((comment) => ({
			...comment,
			contentHtml: comment.content ? prosekitJSONToHTML(comment.content) : null,
			contentMarkdown: comment.content ? prosekitJSONToMarkdown(comment.content) : null,
		}));
		const totalItems = result?.totalComments ?? 0;
		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

		return c.json(
			paginatedSuccessResponse(comments, {
				limit,
				page,
				totalPages,
				totalItems,
				hasMore: page < totalPages,
			})
		);
	}
);

const UpdateTaskSchemaBody = {
	type: "object",
	required: ["orgId"],
	properties: {
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		title: { type: "string" },
		description: { type: "object", description: "Prosekit document JSON." },
		status: {
			type: "string",
			enum: ["backlog", "todo", "in-progress", "done", "canceled"],
		},
		priority: {
			type: "string",
			enum: ["none", "low", "medium", "high", "urgent"],
		},
		category: { type: "string" },
		releaseId: {
			type: ["string", "null"],
			description: 'Release slug (e.g. "v1.2.0") or release id, or null to remove the task from its release.',
		},
		visible: { type: "string", enum: ["public", "private"] },
	},
};

/**
 * Mirrors the internal `PATCH /update` handler's field-level granularity
 * exactly, minus two deliberate narrowings for the API path: no
 * `isSystemAccount` bypass, and no creator/assignee bypass (only
 * `traceOrgPermissionCheck`'s own creator/org-creator god-mode — baked into
 * `assertApiAccess` — still applies).
 *
 * Base gate uses `tasks.read` — the catalog scope mapped to `"members"` that
 * best fits "can this key touch tasks in this org at all" for an endpoint
 * that, with an empty body, is a no-op read-then-write. `tasks.comment` also
 * maps to `"members"` but is about posting comments, not general task access,
 * so using it here would be a confusing scope to require on a caller whose
 * key doesn't need to comment at all.
 */
tasksRoute.patch(
	"/tasks/:taskId",
	describeOkNotFound({
		summary: "Update Task",
		description:
			"Update one or more fields of a task. `status` needs the changeStatus scope, `priority` needs changePriority, and title/description/category/releaseId/visible need editAny — in addition to the base read scope. `releaseId` takes a release slug or id in this organization, or null to remove the task from its release.",
		dataSchema: TaskSchema,
		bodySchema: UpdateTaskSchemaBody,
		bodyExample: { orgId: "platform", status: "done" },
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		// `createdBy` is deliberately never accepted here — a caller must never be
		// able to forge the timeline/notification actor. `updateTaskService` also
		// never reads it, but stripping it at the boundary keeps the contract explicit.
		// biome-ignore lint/correctness/noUnusedVariables: destructured only to strip it from the body
		const { orgId: orgRef, createdBy, ...updates } = body;

		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const canTouchTask = await assertApiAccess(c, orgId, "tasks.read");
		if (!canTouchTask) {
			return c.json(
				errorResponse(
					"You don't have permission to update tasks.",
					"Your API key or your role in this organization doesn't allow this."
				),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, c.req.param("taskId"));
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			with: { githubIssue: {} },
		});
		if (!existingTask) {
			return c.json(errorResponse("Task not found", "No task found with the provided id in the organization"), 404);
		}

		if (updates.status !== undefined) {
			const canChangeStatus = await assertApiAccess(c, orgId, "tasks.changeStatus");
			if (!canChangeStatus) {
				return c.json(errorResponse("You don't have permission to change task status."), 403);
			}
		}
		if (updates.priority !== undefined) {
			const canChangePriority = await assertApiAccess(c, orgId, "tasks.changePriority");
			if (!canChangePriority) {
				return c.json(errorResponse("You don't have permission to change task priority."), 403);
			}
		}
		const editFields = ["title", "description", "category", "releaseId", "visible"];
		if (editFields.some((f) => updates[f] !== undefined)) {
			const canEditAny = await assertApiAccess(c, orgId, "tasks.editAny");
			if (!canEditAny) {
				return c.json(errorResponse("You don't have permission to edit this task."), 403);
			}
		}

		// `releaseId` is a release slug or id (or null to clear). Resolve it within
		// THIS organization before it reaches the update, so a release from another
		// org is a 404 and a malformed value is a 400 rather than a foreign-key error.
		let taskUpdates = updates;
		if (updates.releaseId !== undefined) {
			const resolved = await resolveTaskReleaseRef(orgId, updates.releaseId);
			if (!resolved.ok) return c.json(resolved.body, resolved.status);
			taskUpdates = { ...updates, releaseId: resolved.releaseId };
		}

		const taskWithData = await updateTaskService({
			orgId,
			taskId,
			existingTask,
			updates: taskUpdates,
			actorUserId: principal.userId,
			sseClientId: undefined,
		});

		return c.json(successResponse(taskWithData));
	}
);

const UpdateTaskLabelsSchemaBody = {
	type: "object",
	required: ["orgId", "labelIds"],
	properties: {
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		labelIds: { type: "array", items: { type: "string" }, description: "The full replacement set of label ids." },
	},
};

tasksRoute.post(
	"/tasks/:taskId/labels",
	describeOkNotFound({
		summary: "Set Task Labels",
		description: "Replace the full set of labels on a task (diffed and synced against the current set).",
		dataSchema: TaskSchema,
		bodySchema: UpdateTaskLabelsSchemaBody,
		bodyExample: { orgId: "platform", labelIds: [] },
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const { orgId: orgRef, labelIds } = body;

		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "content.manageLabels");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to manage labels.",
					"Your API key or your role in this organization doesn't allow this."
				),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, c.req.param("taskId"));
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		try {
			const taskWithData = await updateTaskLabelsService({
				orgId,
				taskId,
				labelIds: Array.isArray(labelIds) ? labelIds : [],
				actorUserId: principal.userId,
				sseClientId: undefined,
			});

			return c.json(successResponse(taskWithData));
		} catch (err) {
			if (err instanceof LabelsTaskNotFoundError) {
				return c.json(
					errorResponse("Task not found", "No task found with the provided id in the organization"),
					404
				);
			}
			const errorMessage =
				typeof err === "object" && err !== null && "message" in err
					? String((err as { message?: unknown }).message)
					: String(err);
			return c.json(errorResponse("Failed to update task labels", errorMessage), 500);
		}
	}
);

const UpdateTaskAssigneesSchemaBody = {
	type: "object",
	required: ["orgId", "assigneeIds"],
	properties: {
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		assigneeIds: {
			type: "array",
			items: { type: "string" },
			description: "The full replacement set of assignee user ids.",
		},
	},
};

tasksRoute.post(
	"/tasks/:taskId/assignees",
	describeOkNotFound({
		summary: "Set Task Assignees",
		description: "Replace the full set of assignees on a task (diffed and synced against the current set).",
		dataSchema: TaskSchema,
		bodySchema: UpdateTaskAssigneesSchemaBody,
		bodyExample: { orgId: "platform", assigneeIds: [] },
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const { orgId: orgRef, assigneeIds } = body;

		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const isAuthorized = await assertApiAccess(c, orgId, "tasks.assign");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to assign tasks.",
					"Your API key or your role in this organization doesn't allow this."
				),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, c.req.param("taskId"));
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		try {
			const taskWithData = await updateTaskAssigneesService({
				orgId,
				taskId,
				assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : [],
				actorUserId: principal.userId,
				sseClientId: undefined,
			});

			return c.json(successResponse(taskWithData));
		} catch (err) {
			if (err instanceof AssigneesTaskNotFoundError) {
				return c.json(
					errorResponse("Task not found", "No task found with the provided id in the organization"),
					404
				);
			}
			const errorMessage =
				typeof err === "object" && err !== null && "message" in err
					? String((err as { message?: unknown }).message)
					: String(err);
			return c.json(errorResponse("Failed to update task assignees", errorMessage), 500);
		}
	}
);
