import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "..";
import { notification } from "../../schema/notification.schema";
import { userSummaryColumns } from "./index";
import type { NodeJSON, NotificationWithDetails } from "../../schema";

/**
 * Creates a single notification for a user.
 *
 * @returns The created notification row.
 */
export async function createNotification(params: {
	organizationId: string;
	userId: string;
	actorId?: string | null;
	taskId: string;
	timelineEventId?: string | null;
	type: (typeof schema.notificationTypeEnum.enumValues)[number];
}) {
	const [created] = await db
		.insert(notification)
		.values({
			organizationId: params.organizationId,
			userId: params.userId,
			actorId: params.actorId ?? null,
			taskId: params.taskId,
			timelineEventId: params.timelineEventId ?? null,
			type: params.type,
		})
		.returning();

	return created;
}

/**
 * Creates notifications for multiple users in bulk.
 * Filters out the actor (you don't notify yourself) and deduplicates user IDs.
 *
 * @returns The created notification rows.
 */
export async function createNotifications(params: {
	organizationId: string;
	userIds: string[];
	actorId?: string | null;
	taskId: string;
	timelineEventId?: string | null;
	type: (typeof schema.notificationTypeEnum.enumValues)[number];
}) {
	// Deduplicate and filter out the actor
	const uniqueUserIds = [...new Set(params.userIds)].filter((id) => id !== params.actorId);

	if (uniqueUserIds.length === 0) return [];

	const values = uniqueUserIds.map((userId) => ({
		organizationId: params.organizationId,
		userId,
		actorId: params.actorId ?? null,
		taskId: params.taskId,
		timelineEventId: params.timelineEventId ?? null,
		type: params.type,
	}));

	return await db.insert(notification).values(values).returning();
}

/**
 * Fetches notifications for a user with full details (actor, task, org, timeline event).
 * Supports pagination and filtering by read/archived status.
 */
export async function getNotificationsForUser(
	userId: string,
	options?: {
		limit?: number;
		offset?: number;
		unreadOnly?: boolean;
		organizationId?: string;
	},
): Promise<NotificationWithDetails[]> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const conditions = [
		eq(notification.userId, userId),
		eq(notification.archived, false),
	];

	if (options?.unreadOnly) {
		conditions.push(eq(notification.read, false));
	}

	if (options?.organizationId) {
		conditions.push(eq(notification.organizationId, options.organizationId));
	}

	const results = await db.query.notification.findMany({
		where: and(...conditions),
		with: {
			actor: {
				columns: userSummaryColumns,
			},
			task: {
				columns: {
					id: true,
					shortId: true,
					title: true,
					status: true,
					priority: true,
				},
			},
			organization: {
				columns: {
					id: true,
					name: true,
					slug: true,
					logo: true,
				},
			},
			timelineEvent: {
				columns: {
					id: true,
					eventType: true,
					fromValue: true,
					toValue: true,
				},
			},
		},
		orderBy: desc(notification.createdAt),
		limit,
		offset,
	});

	return results as NotificationWithDetails[];
}

/**
 * Gets the unread notification count for a user.
 */
export async function getUnreadNotificationCount(
	userId: string,
	organizationId?: string,
): Promise<number> {
	const conditions = [
		eq(notification.userId, userId),
		eq(notification.read, false),
		eq(notification.archived, false),
	];

	if (organizationId) {
		conditions.push(eq(notification.organizationId, organizationId));
	}

	const [result] = await db
		.select({ count: count() })
		.from(notification)
		.where(and(...conditions));

	return result?.count ?? 0;
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(notificationId: string, userId: string) {
	const [updated] = await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
		.returning();

	return updated;
}

/**
 * Marks all notifications as read for a user, optionally scoped to an org.
 */
export async function markAllNotificationsRead(userId: string, organizationId?: string) {
	const conditions = [
		eq(notification.userId, userId),
		eq(notification.read, false),
	];

	if (organizationId) {
		conditions.push(eq(notification.organizationId, organizationId));
	}

	return await db
		.update(notification)
		.set({ read: true })
		.where(and(...conditions));
}

/**
 * Archives a single notification (soft delete).
 */
export async function archiveNotification(notificationId: string, userId: string) {
	const [updated] = await db
		.update(notification)
		.set({ archived: true })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
		.returning();

	return updated;
}

/**
 * Gets the assignee user IDs for a task.
 * Used internally to determine who should receive notifications.
 */
export async function getTaskAssigneeIds(taskId: string): Promise<string[]> {
	const assignees = await db
		.select({ userId: schema.taskAssignee.userId })
		.from(schema.taskAssignee)
		.where(eq(schema.taskAssignee.taskId, taskId));

	return assignees.map((a) => a.userId);
}

/**
 * Extracts user mention IDs from ProseMirror/ProseKit NodeJSON content.
 * Walks the content tree recursively to find mention nodes with kind === "user".
 */
export function extractUserMentions(content: NodeJSON | null | undefined): string[] {
	if (!content) return [];

	const mentions: string[] = [];

	function walk(node: NodeJSON) {
		if (node.type === "mention" && node.attrs?.kind === "user" && node.attrs?.id) {
			mentions.push(node.attrs.id as string);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return [...new Set(mentions)];
}
