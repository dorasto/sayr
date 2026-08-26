import { addLogEventTask, createTask, db, getOrganizationMembers, getTaskById, schema } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import {
	findSSEClientsByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId, resolveTaskId } from "../../../../../lib/apiRefs";
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
import { CreatedBySchema, resolveActorId, TaskSchema } from "./schemas";

export const tasksRoute = new Hono<AppEnv>();

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
		const { orgId: orgRef, title, description, status, priority, category, integration, createdBy } = body;

		// Accept a slug ("platform") or an id, so callers can use what the UI shows them.
		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const { userId, invalidProvider } = await resolveActorId(createdBy, principal.userId);
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
						releaseId: null,
						visible: "public",
						parentId: null,
					},
					userId
				),
			{
				description: "Creating task record",
				data: { orgId, title, status, priority, category },
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

		const { userId, invalidProvider } = await resolveActorId(createdBy, principal.userId);
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

		// Caller is a verified member at this point, so always query without the
		// public-only visibility filter — members see public + private, same as
		// the internal route does for members (`isPublic: false`).
		const totalItems = await traceAsync(
			"me.tasks.count",
			async () => {
				const [result] = await db
					.select({ count: sql<number>`count(*)` })
					.from(schema.task)
					.where(baseTaskWhere(orgId, categoryId, searchQuery, includeClosed, false));

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
					where: baseTaskWhere(orgId, categoryId, searchQuery, includeClosed, false),
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

		return c.json(successResponse(task));
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
		releaseId: { type: "string" },
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
			"Update one or more fields of a task. `status` needs the changeStatus scope, `priority` needs changePriority, and title/description/category/releaseId/visible need editAny — in addition to the base read scope.",
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

		const taskWithData = await updateTaskService({
			orgId,
			taskId,
			existingTask,
			updates,
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
