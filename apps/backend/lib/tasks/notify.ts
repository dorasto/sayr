import {
	addLogEventTask,
	extractTaskMentions,
	extractUserMentions,
	getOrganizationMembers,
	getTaskAssigneeIds,
	type schema,
} from "@repo/database";
import { sseBroadcastByUserId } from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";
import { AppTypeNotification, createNotification } from "@/index";

/**
 * Creates notifications for task assignees and broadcasts them via WebSocket.
 * Runs async (fire-and-forget) to avoid blocking the response.
 *
 * Moved verbatim out of `routes/api/internal/v1/task.ts` so both the internal
 * `/update` route and the extracted `updateTaskService` (used by both the
 * internal route and `/v1/me`) share one implementation instead of drifting.
 */
export async function notifyAssignees(params: {
	taskId: string;
	orgId: string;
	actorId: string | undefined;
	type: AppTypeNotification
	timelineEventId?: string;
}) {
	try {
		const taskAssigneeIds = await getTaskAssigneeIds(params.taskId);
		if (taskAssigneeIds.length === 0) return;
		// A removed member can keep a stale assignee row — only notify current members of the org.
		const memberIds = new Set((await getOrganizationMembers(params.orgId)).map((m) => m.userId));
		const assigneeIds = taskAssigneeIds.filter((id) => memberIds.has(id));
		if (assigneeIds.length === 0) return;
		// Deduplicate and filter out the actor
		const uniqueUserIds = [...new Set(assigneeIds)].filter((id) => id !== params.actorId);
		if (uniqueUserIds.length === 0) return [];
		for (const item of uniqueUserIds) {
			createNotification({
				type: params.type,
				resourceId: params.orgId,
				recipientId: item,
				actorId: params.actorId ?? null,
				data: {
					taskId: params.taskId,
					timelineEventId: params.timelineEventId ?? undefined,
				}
			} as Parameters<typeof createNotification>[0]);
		}
	} catch {
		// Notification failures should never break task operations
	}
}

/**
 * Creates mention notifications by extracting @mentions from content.
 * Unlike other notification types, mentions do NOT filter out the actor —
 * if you explicitly @mention yourself, you should still receive the notification.
 */
export async function notifyMentions(params: {
	taskId: string;
	orgId: string;
	actorId: string | undefined;
	content: schema.NodeJSON | null | undefined;
	timelineEventId?: string;
}) {
	try {
		const mentionedUserIds = extractUserMentions(params.content);
		if (mentionedUserIds.length === 0) return;

		// Use individual createNotification (not bulk) to avoid actor filtering.
		// Mentions are explicit — the user typed @someone — so self-mentions are intentional.
		const dedupedIds = [...new Set(mentionedUserIds)];
		for (const userId of dedupedIds) {
			createNotification({
				type: "mention",
				resourceId: params.orgId,
				recipientId: userId,
				actorId: params.actorId ?? null,
				data: {
					taskId: params.taskId,
					timelineEventId: params.timelineEventId ?? undefined,
				}
			});
		}
	} catch {
		// Notification failures should never break task operations
	}
}

/**
 * Side effects of a new task comment: a "comment" notification to the task's assignees, a "mention"
 * notification to mentioned users who aren't assignees (one notification each, never both), and a
 * "task_mentioned" timeline event on every other task the comment mentions.
 *
 * Moved verbatim out of the internal `/create-comment` route so the MCP `create_comment` tool and
 * `POST /v1/me/tasks/:id/comments` run exactly the same rules (SAY-101) instead of skipping them.
 */
export async function notifyCommentCreated(params: {
	taskId: string;
	orgId: string;
	actorId: string | null | undefined;
	commentId: string | undefined;
	content: schema.NodeJSON | null | undefined;
}) {
	const { taskId, orgId, actorId, commentId, content } = params;

	// Notify assignees and mentioned users about the new comment.
	// Users who are both assigned AND mentioned only receive one notification (the "comment" type).
	const assigneeIds = await getTaskAssigneeIds(taskId);
	const mentionedUserIds = extractUserMentions(content);

	// Send "comment" notifications to all assignees (filtered by actor inside createNotifications)
	notifyAssignees({ taskId, orgId, actorId: actorId ?? undefined, type: "comment" });

	// Send "mention" notifications only to mentioned users who are NOT assignees.
	// Assignees already receive a "comment" notification above, so skip them to avoid duplicates.
	const assigneeSet = new Set(assigneeIds);
	const mentionOnlyUserIds = [...new Set(mentionedUserIds)].filter((id) => !assigneeSet.has(id));
	for (const userId of mentionOnlyUserIds) {
		try {
			await createNotification({
				type: "mention",
				resourceId: orgId,
				recipientId: userId,
				actorId: actorId ?? null,
				data: { taskId, commentId },
			});
		} catch {
			// Notification failures should never break task operations
		}
	}

	// Fire timeline events on any tasks mentioned in the comment.
	// Each mentioned task gets a "task_mentioned" event pointing back to this task.
	const mentionedTaskIds = extractTaskMentions(content);
	await Promise.all(
		mentionedTaskIds
			.filter((id) => id !== taskId) // skip self-mentions
			.map((mentionedTaskId) =>
				addLogEventTask(
					mentionedTaskId,
					orgId,
					"task_mentioned",
					null,
					{ sourceTaskId: taskId },
					actorId ?? undefined
				).catch(
					() => {} // never let timeline failures break comment creation
				)
			)
	);
}
