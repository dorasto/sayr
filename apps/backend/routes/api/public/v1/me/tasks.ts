import { addLogEventTask, createTask, db, getOrganizationMembers, getTaskById } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
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
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { CreatedBySchema, resolveActorId } from "./schemas";

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
