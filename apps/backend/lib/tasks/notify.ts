import {
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
