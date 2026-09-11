import {
	createNotification,
	createNotifications,
	extractUserMentions,
	getTaskAssigneeIds,
	type schema,
} from "@repo/database";
import { sseBroadcastByUserId } from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";

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
	type: (typeof schema.notificationTypeEnum.enumValues)[number];
	timelineEventId?: string;
}) {
	try {
		const assigneeIds = await getTaskAssigneeIds(params.taskId);
		if (assigneeIds.length === 0) return;

		const notifications = await createNotifications({
			organizationId: params.orgId,
			userIds: assigneeIds,
			actorId: params.actorId ?? null,
			taskId: params.taskId,
			timelineEventId: params.timelineEventId ?? null,
			type: params.type,
		});

		// Broadcast to each recipient via WebSocket
		for (const notif of notifications) {
			sseBroadcastByUserId(notif.userId, "", params.orgId, {
				type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
				data: notif,
				meta: { ts: Date.now() },
			});
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
			const notif = await createNotification({
				organizationId: params.orgId,
				userId,
				actorId: params.actorId ?? null,
				taskId: params.taskId,
				timelineEventId: params.timelineEventId ?? null,
				type: "mention",
			});

			if (notif) {
				sseBroadcastByUserId(notif.userId, "", params.orgId, {
					type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
					data: notif,
					meta: { ts: Date.now() },
				});
			}
		}
	} catch {
		// Notification failures should never break task operations
	}
}
