import { Octokit } from "@octokit/rest";
import { addLogEventTask, db, getOrganizationMembers, getTaskById, schema } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { enqueue } from "@repo/queue";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, eq, isNull } from "drizzle-orm";
import { emitEvent } from "@/clickhouse";
import {
	findClientBysseId,
	findSSEClientsByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";
import { notifyAssignees, notifyMentions } from "./notify";

/**
 * Shared task-update mutation service, extracted verbatim from the internal
 * `PATCH /update` handler (`routes/api/internal/v1/task.ts`) so both that
 * route and `/v1/me` `PATCH /tasks/:taskId` fire the exact same side effects
 * (timeline events, notifications, GitHub sync, ClickHouse events, embed
 * queue, SSE broadcasts) instead of drifting apart.
 *
 * Permission checks are NOT here — they stay in each caller's route handler,
 * since the internal route's checks (session + creator/assignee bypass) and
 * the API route's checks (key scope, no bypass) are deliberately different.
 * By the time this runs, the caller has already decided the request is
 * authorized and has resolved who the acting user is.
 */
export interface UpdateTaskServiceParams {
	orgId: string;
	taskId: string;
	/** The task row as looked up with its `githubIssue` relation, matching the internal route's lookup shape. */
	existingTask: schema.taskType & { githubIssue?: schema.githubIssueType | null };
	/** Raw allowed-fields subset (title/description/status/priority/category/releaseId/visible). Must NOT contain `createdBy` — callers strip it before invoking. */
	updates: Record<string, unknown>;
	/** The resolved acting user id. The service never reads `updates.createdBy` itself. */
	actorUserId: string;
	/** Optional SSE client id to exclude from the broadcast (the caller's own already-applied client). `undefined` for API callers, so every connected client — including the caller's own future SSE connections — receives the broadcast. */
	sseClientId?: string;
}

export async function updateTaskService(params: UpdateTaskServiceParams) {
	const { orgId, taskId, existingTask, updates, actorUserId, sseClientId } = params;
	const traceAsync = createTraceAsync();
	const userId = actorUserId;

	const allowed: Partial<schema.taskType> = {};
	["title", "description", "status", "priority", "category", "releaseId", "visible"].forEach((field) => {
		if (updates[field] !== undefined) {
			// @ts-expect-error dynamic field
			allowed[field] = updates[field];
		}
	});

	await traceAsync(
		"task.update.save",
		async () => {
			if (Object.keys(allowed).length > 0) {
				await db
					.update(schema.task)
					.set({ ...allowed, updatedAt: new Date() })
					.where(and(eq(schema.task.id, taskId), eq(schema.task.organizationId, orgId)))
					.returning();
			}

			if (updates.category && updates.category !== existingTask.category) {
				await addLogEventTask(taskId, orgId, "category_change", existingTask.category, updates.category, userId);
			}
			if (updates.status && updates.status !== existingTask.status) {
				const event = await addLogEventTask(
					taskId,
					orgId,
					"status_change",
					existingTask.status,
					updates.status,
					userId
				);

				notifyAssignees({
					taskId,
					orgId,
					actorId: userId,
					type: "status_change",
					timelineEventId: event?.id,
				});

				if ((updates.status === "done" || updates.status === "in-progress") && existingTask?.githubIssue) {
					// Derive the issue number from your stored field.
					// Adjust this if your schema is different.
					const issueNumber = existingTask.githubIssue.issueNumber ?? existingTask.githubIssue;

					if (!issueNumber) {
						// No issue number to close; just skip quietly
						return;
					}

					const foundLink = await db.query.githubRepository.findFirst({
						where: and(
							eq(schema.githubRepository.organizationId, orgId),
							isNull(schema.githubRepository.categoryId),
							eq(schema.githubRepository.enabled, true)
						),
					});

					// No linked repo? Just skip GitHub logic, but don't break the request.
					if (!foundLink) {
						return;
					}

					try {
						const token = await getInstallationToken(foundLink.installationId);
						const octokit = new Octokit({ auth: token });

						// Resolve owner/repo from the repoId
						const { data: repoInfo } = await octokit.request("GET /repositories/{repository_id}", {
							repository_id: foundLink.repoId,
						});

						const owner = repoInfo.owner.login;
						const repo = repoInfo.name;

						await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
							owner,
							repo,
							issue_number: issueNumber,
							state: updates.status === "in-progress" ? "open" : "closed",
						});
					} catch (err) {
						// Don't throw; just log so it doesn't affect the main task update flow
						console.error("Failed to close GitHub issue", {
							orgId,
							taskId,
							issueNumber,
							error: err,
						});
					}
				}
			}
			if (updates.priority && updates.priority !== existingTask.priority) {
				const event = await addLogEventTask(
					taskId,
					orgId,
					"priority_change",
					existingTask.priority,
					updates.priority,
					userId
				);
				notifyAssignees({ taskId, orgId, actorId: userId, type: "priority_change", timelineEventId: event?.id });
			}
			if (updates.title && updates.title !== existingTask.title) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "title", value: existingTask.title },
					{ field: "title", value: updates.title },
					userId
				);
			}
			if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
				const event = await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "description", value: existingTask.description },
					{ field: "description", value: updates.description },
					userId,
					updates.description as schema.NodeJSON
				);
				// Check for new @mentions in the updated description
				notifyMentions({
					taskId,
					orgId,
					actorId: userId,
					content: updates.description as schema.NodeJSON | null | undefined,
					timelineEventId: event?.id,
				});
			}
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				await addLogEventTask(taskId, orgId, "release_change", existingTask.releaseId, updates.releaseId, userId);
			}
			if (updates.visible !== undefined && updates.visible !== existingTask.visible) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "visible", value: existingTask.visible },
					{ field: "visible", value: updates.visible },
					userId
				);
			}
		},
		{
			description: "Updating task and logging changes",
			data: { orgId, taskId, fields: Object.keys(allowed) },
			onSuccess: () => ({
				description: "Task updated successfully",
				data: { updates: allowed },
			}),
		}
	);

	// Emit ClickHouse analytics events for each field change
	if (updates.status && updates.status !== existingTask.status) {
		emitEvent({
			event_type: "task.status_changed",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { from: existingTask.status, to: updates.status },
		});
	}
	if (updates.priority && updates.priority !== existingTask.priority) {
		emitEvent({
			event_type: "task.priority_changed",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { from: existingTask.priority, to: updates.priority },
		});
	}
	if (updates.category && updates.category !== existingTask.category) {
		emitEvent({
			event_type: "task.category_changed",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { from: existingTask.category, to: updates.category },
		});
	}
	if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
		emitEvent({
			event_type: "task.release_changed",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { from: existingTask.releaseId, to: updates.releaseId },
		});
	}
	if (updates.title && updates.title !== existingTask.title) {
		emitEvent({
			event_type: "task.updated",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { field: "title" },
		});
	}
	if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
		emitEvent({
			event_type: "task.updated",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { field: "description" },
		});
	}
	if (updates.visible !== undefined && updates.visible !== existingTask.visible) {
		emitEvent({
			event_type: "task.updated",
			actor_id: userId ?? "",
			target_id: taskId,
			org_id: orgId,
			metadata: { field: "visible" },
		});
	}

	// Fire-and-forget: only re-embed when the content that actually feeds the
	// embedding (title/description) changed — same diffing already used for
	// the task.updated ClickHouse events above, so an unrelated field change
	// (status/priority/etc) doesn't trigger a wasted embedding call. Cloud-only,
	// same as the /create enqueue.
	const titleChanged = updates.title !== undefined && updates.title !== existingTask.title;
	const descriptionChanged =
		updates.description !== undefined &&
		JSON.stringify(updates.description) !== JSON.stringify(existingTask.description);
	if ((titleChanged || descriptionChanged) && getEditionCapabilities().semanticSearchEnabled) {
		enqueue("main", { type: "embed_task", payload: { orgId, taskId } }).catch((err) => {
			console.error("[task.update] Failed to enqueue embed_task job:", err);
		});
	}

	const taskWithData = await traceAsync("task.update.refetch", () => getTaskById(orgId, taskId), {
		description: "Refetching updated task data",
	});

	await traceAsync(
		"task.update.broadcast",
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

			// If releaseId changed, broadcast release update as well
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				const releaseData = {
					type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"],
					data: { taskId, releaseId: updates.releaseId },
				};
				sseBroadcastToRoom(orgId, "releases", releaseData, found?.id);
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
		{ description: "Broadcasting task update to clients" }
	);

	return taskWithData;
}
