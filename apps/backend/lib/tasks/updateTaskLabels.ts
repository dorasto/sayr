import {
	addLabelToTask,
	addLogEventTask,
	db,
	getOrganizationMembers,
	getTaskById,
	removeLabelFromTask,
} from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { emitEvent } from "@/clickhouse";
import {
	findClientBysseId,
	findSSEClientsByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";

/**
 * Shared label-sync mutation service, extracted verbatim from the internal
 * `POST /update-labels` handler (`routes/api/internal/v1/task.ts`) so both
 * that route and `/v1/me` `POST /tasks/:taskId/labels` fire the exact same
 * diff-and-broadcast behavior.
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

export interface UpdateTaskLabelsServiceParams {
	orgId: string;
	taskId: string;
	labelIds: string[];
	actorUserId: string | undefined;
	sseClientId?: string;
}

export async function updateTaskLabelsService(params: UpdateTaskLabelsServiceParams) {
	const { orgId, taskId, labelIds, actorUserId, sseClientId } = params;
	const traceAsync = createTraceAsync();

	const existingTask = await traceAsync(
		"task.labels.update.lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
				with: { labels: { with: { label: true } } },
			}),
		{
			description: "Finding task with current labels",
			data: { orgId, taskId },
		}
	);

	if (!existingTask) {
		throw new TaskNotFoundError();
	}

	const currentLabelIds = existingTask.labels.map((l) => l.label.id);
	const incomingLabelIds: string[] = labelIds ?? [];

	await traceAsync(
		"task.labels.update.sync",
		async () => {
			for (const labelId of incomingLabelIds) {
				if (!currentLabelIds.includes(labelId)) {
					await addLabelToTask(orgId, taskId, labelId);
					await addLogEventTask(taskId, orgId, "label_added", null, labelId, actorUserId);
				}
			}

			for (const labelId of currentLabelIds) {
				if (!incomingLabelIds.includes(labelId)) {
					await removeLabelFromTask(orgId, taskId, labelId);
					await addLogEventTask(taskId, orgId, "label_removed", null, labelId, actorUserId);
				}
			}
		},
		{
			description: "Syncing task labels",
			data: {
				orgId,
				taskId,
				currentCount: currentLabelIds.length,
				incomingCount: incomingLabelIds.length,
			},
			onSuccess: () => ({
				description: "Task labels synced successfully",
				data: {
					added: incomingLabelIds.filter((id) => !currentLabelIds.includes(id)),
					removed: currentLabelIds.filter((id) => !incomingLabelIds.includes(id)),
				},
			}),
		}
	);

	// Emit ClickHouse analytics events for label changes
	for (const labelId of incomingLabelIds) {
		if (!currentLabelIds.includes(labelId)) {
			emitEvent({
				event_type: "task.label_added",
				actor_id: actorUserId ?? "",
				target_id: taskId,
				org_id: orgId,
				metadata: { labelId },
			});
		}
	}
	for (const labelId of currentLabelIds) {
		if (!incomingLabelIds.includes(labelId)) {
			emitEvent({
				event_type: "task.label_removed",
				actor_id: actorUserId ?? "",
				target_id: taskId,
				org_id: orgId,
				metadata: { labelId },
			});
		}
	}

	const taskWithData = await traceAsync("task.labels.update.refetch", () => getTaskById(orgId, taskId), {
		description: "Refetching updated task data",
	});

	await traceAsync(
		"task.labels.update.broadcast",
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
		{ description: "Broadcasting label update to clients" }
	);

	return taskWithData;
}
