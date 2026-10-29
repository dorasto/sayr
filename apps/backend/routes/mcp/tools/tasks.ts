import { addLogEventTask, createTask, db, getOrganizationMembers, getTaskById, toPublicTask } from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveReleaseId, resolveTaskId } from "../../../lib/apiRefs";
import { assertMcpAccess } from "../../../lib/mcp/auth";
import {
	TaskNotFoundError as AssigneesTaskNotFoundError,
	NonMemberAssigneeError,
	updateTaskAssigneesService,
} from "../../../lib/tasks/updateTaskAssignees";
import {
	TaskNotFoundError as LabelsTaskNotFoundError,
	updateTaskLabelsService,
} from "../../../lib/tasks/updateTaskLabels";
import { updateTaskService } from "../../../lib/tasks/updateTask";
import { prosekitJSONToMarkdown } from "../../../prosekit/markdown";
import { markdownToProsekitJSON } from "../../../prosekit/parser";
import { baseTaskWhere } from "../../api/internal/v1/task";
import { findSSEClientsByUserId, sseBroadcastIndividual, sseBroadcastPublic, sseBroadcastToRoom } from "../../events";
import type { ServerEventBaseMessage } from "../../events/types";
import { type McpUserClaims, resolveAndRateLimitOrg, toolError, toolJson } from "../context";

/** Mirrors tasks.ts's own create-broadcast block — keeps browsers in sync regardless of which surface created the task. */
async function broadcastTaskCreated(orgId: string, taskWithData: Awaited<ReturnType<typeof getTaskById>>) {
	const data = { type: "CREATE_TASK" as ServerEventBaseMessage["type"], data: taskWithData };
	sseBroadcastToRoom(orgId, "tasks", data);
	if (taskWithData?.visible === "public") {
		const publicData = { ...data, data: toPublicTask(taskWithData) };
		sseBroadcastPublic(orgId, publicData);
	}
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findSSEClientsByUserId(member.userId);
		clients.forEach((client) => client.channel !== "tasks" && sseBroadcastIndividual(client, data, orgId));
	});
}

const taskSummary = (task: NonNullable<Awaited<ReturnType<typeof getTaskById>>>) => ({
	id: task.id,
	shortId: task.shortId,
	title: task.title,
	status: task.status,
	priority: task.priority,
	visible: task.visible,
	category: task.category,
	releaseId: task.releaseId,
	labels: task.labels.map((l) => l.name),
	assignees: task.assignees.map((a) => ({ id: a.id, name: a.name })),
	createdAt: task.createdAt,
	updatedAt: task.updatedAt,
});

export function registerTaskTools(server: McpServer, claims: McpUserClaims | null) {
	server.registerTool(
		"list_tasks",
		{
			title: "List tasks",
			description:
				"List tasks in an organization the user is a member of. Always includes public and private tasks, never degrades to a public-only view.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				query: z.string().optional().describe("Search query."),
				includeClosed: z.boolean().optional().describe("Include done/canceled tasks. Default false."),
				limit: z.number().int().min(1).max(30).optional().describe("Max results, up to 30. Default 30."),
			}),
		},
		async ({ org, query, includeClosed, limit }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read tasks here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const where = baseTaskWhere(orgId, undefined, query, includeClosed ?? false, false);
			const rows = await db.query.task.findMany({
				where,
				columns: { embedding: false },
				orderBy: (t, { desc }) => [desc(t.createdAt)],
				limit: limit ?? 30,
				with: {
					labels: { with: { label: true } },
					assignees: { with: { user: { columns: { id: true, name: true, image: true } } } },
				},
			});

			return toolJson(
				rows.map((task) => ({
					id: task.id,
					shortId: task.shortId,
					title: task.title,
					status: task.status,
					priority: task.priority,
					visible: task.visible,
					labels: task.labels.map((l) => l.label.name),
					assignees: task.assignees.map((a) => a.user.name),
					createdAt: task.createdAt,
				}))
			);
		}
	);

	server.registerTool(
		"get_task",
		{
			title: "Get task",
			description:
				"Get a single task's full details, including its description (as Markdown), labels, assignees, and release.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
			}),
		},
		async ({ org, task: taskRef }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read tasks here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			const task = await getTaskById(orgId, taskId);
			if (!task) return toolError(`No task found for "${taskRef}" in this organization.`);

			// The full description only here — list_tasks and the mutation tools keep the
			// slimmer taskSummary so their responses stay small.
			return toolJson({
				...taskSummary(task),
				description: task.description ? prosekitJSONToMarkdown(task.description) : null,
			});
		}
	);

	server.registerTool(
		"create_task",
		{
			title: "Create task",
			description: "Create a new task in an organization the user is a member of.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				title: z.string().min(1),
				description: z.string().optional().describe("Markdown description."),
				status: z.enum(["backlog", "todo", "in-progress", "done", "canceled"]).optional(),
				priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
			}),
		},
		async ({ org, title, description, status, priority }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.create");
			if (!allowed) {
				return toolError(
					"You don't have permission to create tasks here — the token is missing the tasks.create scope, or your role in this organization doesn't allow it."
				);
			}

			const descriptionProsekit = description ? markdownToProsekitJSON(description) : undefined;
			const task = await createTask(
				orgId,
				{ title, description: descriptionProsekit, status, priority, visible: "public", parentId: null },
				claims.userId
			);
			if (!task) return toolError("Failed to create task.");

			await addLogEventTask(
				task.id,
				orgId,
				"created",
				null,
				{ status, priority, title, labels: [], assignees: [] },
				claims.userId,
				descriptionProsekit
			);

			const taskWithData = await getTaskById(orgId, task.id);
			await broadcastTaskCreated(orgId, taskWithData);

			return toolJson({ id: task.id, shortId: task.shortId, title: task.title });
		}
	);

	server.registerTool(
		"update_task",
		{
			title: "Update task",
			description:
				"Update one or more fields of a task. Changing status needs the changeStatus scope, priority needs changePriority, and title/description/category/releaseId/visible need editAny — all in addition to the base tasks.read scope. category is a category id (see list_categories); releaseId is a release slug or id, or null to remove the task from its release.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				title: z.string().optional(),
				description: z.string().optional().describe("Markdown description."),
				status: z.enum(["backlog", "todo", "in-progress", "done", "canceled"]).optional(),
				priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
				category: z.string().nullable().optional().describe("A category id, or null to clear it."),
				releaseId: z
					.string()
					.nullable()
					.optional()
					.describe('A release slug (e.g. "v1.2.0") or id, or null to remove it from its release.'),
				visible: z.enum(["public", "private"]).optional(),
			}),
		},
		async ({ org, task: taskRef, description, ...rest }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const canTouchTask = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!canTouchTask) {
				return toolError(
					"You don't have permission to update tasks here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			const existingTask = await db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
				with: { githubIssue: {} },
			});
			if (!existingTask) return toolError(`No task found for "${taskRef}" in this organization.`);

			if (rest.status !== undefined) {
				const canChangeStatus = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.changeStatus");
				if (!canChangeStatus) return toolError("You don't have permission to change this task's status.");
			}
			if (rest.priority !== undefined) {
				const canChangePriority = await assertMcpAccess(
					claims.userId,
					orgId,
					claims.scopes,
					"tasks.changePriority"
				);
				if (!canChangePriority) return toolError("You don't have permission to change this task's priority.");
			}
			const editFields = ["title", "category", "releaseId", "visible"] as const;
			if (description !== undefined || editFields.some((f) => rest[f] !== undefined)) {
				const canEditAny = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.editAny");
				if (!canEditAny) {
					return toolError(
						"You don't have permission to edit this task's title, description, category, release or visibility — the token is missing the tasks.editAny scope, or your role in this organization doesn't allow it."
					);
				}
			}

			const updates: Record<string, unknown> = { ...rest };
			if (description !== undefined) updates.description = markdownToProsekitJSON(description);
			// The update service silently drops foreign-org ids; resolve here so the agent gets a real error.
			if (rest.releaseId) {
				const releaseId = await resolveReleaseId(orgId, rest.releaseId);
				if (!releaseId) return toolError(`No release found for "${rest.releaseId}" in this organization.`);
				updates.releaseId = releaseId;
			}
			const categoryId = rest.category;
			if (categoryId) {
				const category = await db.query.category.findFirst({
					where: (cat) => and(eq(cat.id, categoryId), eq(cat.organizationId, orgId)),
				});
				if (!category) return toolError(`No category found for "${categoryId}" in this organization.`);
			}

			const taskWithData = await updateTaskService({
				orgId,
				taskId,
				existingTask,
				updates,
				actorUserId: claims.userId,
				sseClientId: undefined,
			});

			return toolJson(taskWithData ? taskSummary(taskWithData) : { id: taskId });
		}
	);

	server.registerTool(
		"set_task_labels",
		{
			title: "Set task labels",
			description:
				"Replace the full set of labels on a task (not additive — pass every label id the task should end up with). Use list_labels first to find ids.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				labelIds: z.array(z.string()).describe("The full replacement set of label ids."),
			}),
		},
		async ({ org, task: taskRef, labelIds }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "content.manageLabels");
			if (!allowed) {
				return toolError(
					"You don't have permission to manage labels here — the token is missing the content.manageLabels scope, or your role in this organization doesn't allow it."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			try {
				const taskWithData = await updateTaskLabelsService({
					orgId,
					taskId,
					labelIds,
					actorUserId: claims.userId,
					sseClientId: undefined,
				});
				return toolJson(taskWithData ? taskSummary(taskWithData) : { id: taskId });
			} catch (err) {
				if (err instanceof LabelsTaskNotFoundError)
					return toolError(`No task found for "${taskRef}" in this organization.`);
				return toolError(`Failed to update task labels: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	);

	server.registerTool(
		"set_task_assignees",
		{
			title: "Set task assignees",
			description:
				"Replace the full set of assignees on a task (not additive — pass every user id the task should end up with). Use list_members first to find ids.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				assigneeIds: z.array(z.string()).describe("The full replacement set of assignee user ids."),
			}),
		},
		async ({ org, task: taskRef, assigneeIds }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.assign");
			if (!allowed) {
				return toolError(
					"You don't have permission to assign tasks here — the token is missing the tasks.assign scope, or your role in this organization doesn't allow it."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			try {
				const taskWithData = await updateTaskAssigneesService({
					orgId,
					taskId,
					assigneeIds,
					actorUserId: claims.userId,
					sseClientId: undefined,
				});
				return toolJson(taskWithData ? taskSummary(taskWithData) : { id: taskId });
			} catch (err) {
				if (err instanceof AssigneesTaskNotFoundError)
					return toolError(`No task found for "${taskRef}" in this organization.`);
				if (err instanceof NonMemberAssigneeError)
					return toolError(`${err.message}. Use list_members to find valid ids.`);
				return toolError(`Failed to update task assignees: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	);
}
