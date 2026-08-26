import {
	addLogEventTask,
	createNotification,
	db,
	getOrganizationMembers,
	getTaskById,
	schema,
	userSummaryColumns,
} from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { emitEvent } from "@/clickhouse";
import {
	findClientBysseId,
	findSSEClientsByUserId,
	sseBroadcastByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";

/**
 * Shared assignee-sync mutation service, extracted verbatim from the
 * internal `POST /update-assignees` handler (`routes/api/internal/v1/task.ts`)
 * so both that route and `/v1/me` `POST /tasks/:taskId/assignees` fire the
 * exact same diff-and-broadcast behavior, including per-assignee
 * notifications.
 *
 * Permission checks stay in each caller's route handler. This throws on a
 * missing task (`TaskNotFoundError`) rather than formatting a response —
 * each caller catches and formats its own error shape, matching the
 * internal route's existing try/catch pattern.
 */
export class TaskNotFoundError extends Error {
	constructor() {
		super("Task not found");
		this.name = "TaskNotFoundError";
	}
}

export interface UpdateTaskAssigneesServiceParams {
	orgId: string;
	taskId: string;
	assigneeIds: string[];
	actorUserId: string | undefined;
	sseClientId?: string;
}

export async function updateTaskAssigneesService(params: UpdateTaskAssigneesServiceParams) {
	const { orgId, taskId, assigneeIds, actorUserId, sseClientId } = params;
	const traceAsync = createTraceAsync();

	const existingTask = await traceAsync(
		"task.assignees.update.lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
				with: {
					assignees: {
						with: {
							user: { columns: userSummaryColumns },
						},
					},
				},
			}),
		{
			description: "Finding task with current assignees",
			data: { orgId, taskId },
		}
	);

	if (!existingTask) {
		throw new TaskNotFoundError();
	}

	const currentAssigneeIds = existingTask.assignees.map((a) => a.user.id);
	const incomingAssigneeIds: string[] = assigneeIds ?? [];

	await traceAsync(
		"task.assignees.update.sync",
		async () => {
			for (const userId of incomingAssigneeIds) {
				if (!currentAssigneeIds.includes(userId)) {
					await db
						.insert(schema.taskAssignee)
						.values({ taskId, organizationId: orgId, userId })
						.onConflictDoNothing();
					const event = await addLogEventTask(taskId, orgId, "assignee_added", null, userId, actorUserId);
					// Notify the newly assigned user
					createNotification({
						organizationId: orgId,
						userId,
						actorId: actorUserId,
						taskId,
						timelineEventId: event?.id,
						type: "assignee_added",
					})
						.then((notif) => {
							if (notif && notif.userId !== actorUserId) {
								sseBroadcastByUserId(notif.userId, "", orgId, {
									type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
									data: notif,
									meta: { ts: Date.now() },
								});
							}
						})
						.catch(() => {});
				}
			}

			for (const userId of currentAssigneeIds) {
				if (!incomingAssigneeIds.includes(userId)) {
					await db
						.delete(schema.taskAssignee)
						.where(
							and(
								eq(schema.taskAssignee.taskId, taskId),
								eq(schema.taskAssignee.organizationId, orgId),
								eq(schema.taskAssignee.userId, userId)
							)
						);
					const event = await addLogEventTask(taskId, orgId, "assignee_removed", null, userId, actorUserId);
					// Notify the removed user
					createNotification({
						organizationId: orgId,
						userId,
						actorId: actorUserId,
						taskId,
						timelineEventId: event?.id,
						type: "assignee_removed",
					})
						.then((notif) => {
							if (notif && notif.userId !== actorUserId) {
								sseBroadcastByUserId(notif.userId, "", orgId, {
									type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
									data: notif,
									meta: { ts: Date.now() },
								});
							}
						})
						.catch(() => {});
				}
			}
		},
		{
			description: "Syncing task assignees",
			data: {
				orgId,
				taskId,
				currentCount: currentAssigneeIds.length,
				incomingCount: incomingAssigneeIds.length,
			},
			onSuccess: () => ({
				description: "Task assignees synced successfully",
				data: {
					added: incomingAssigneeIds.filter((id) => !currentAssigneeIds.includes(id)),
					removed: currentAssigneeIds.filter((id) => !incomingAssigneeIds.includes(id)),
				},
			}),
		}
	);

	// Emit ClickHouse analytics events for assignee changes
	for (const userId of incomingAssigneeIds) {
		if (!currentAssigneeIds.includes(userId)) {
			emitEvent({
				event_type: "task.assignee_added",
				actor_id: actorUserId ?? "",
				target_id: taskId,
				org_id: orgId,
				metadata: { userId },
			});
		}
	}
	for (const userId of currentAssigneeIds) {
		if (!incomingAssigneeIds.includes(userId)) {
			emitEvent({
				event_type: "task.assignee_removed",
				actor_id: actorUserId ?? "",
				target_id: taskId,
				org_id: orgId,
				metadata: { userId },
			});
		}
	}

	const taskWithData = await traceAsync("task.assignees.update.refetch", () => getTaskById(orgId, taskId), {
		description: "Refetching updated task data",
	});

	await traceAsync(
		"task.assignees.update.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.id, true);
			if (taskWithData?.visible === "public") {
				sseBroadcastPublic(orgId, { ...data }, found?.id);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
				);
			});
		},
		{ description: "Broadcasting assignee update to clients" }
	);

	return taskWithData;
}
