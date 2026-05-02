import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, auth, schema } from "..";
import { userSummarySelect } from "./index";

/**
 * Searches users across the entire platform by name/displayName.
 * Used for global @mention autocomplete.
 *
 * @param options - Optional search parameters.
 * @param options.query - Text to match against user name or displayName (case-insensitive).
 * @param options.limit - Max results to return (default 20).
 * @param options.excludeIds - User IDs to exclude from results.
 * @param options.includeIds - Prioritized user IDs to include first (regardless of text match).
 * @returns Array of UserSummary objects matching the criteria.
 *
 * @example
 * ```ts
 * // Search all users
 * const results = await searchUsers({ query: "tom", limit: 10 });
 *
 * // Search excluding specific users
 * const results = await searchUsers({ query: "tom", excludeIds: ["user_123"] });
 *
 * // Include prioritized users first
 * const results = await searchUsers({ query: "tom", includeIds: ["user_456"] });
 * ```
 */
export async function searchUsers(
	options?: {
		query?: string;
		limit?: number;
		excludeIds?: string[];
		includeIds?: string[];
	},
): Promise<schema.UserSummary[]> {
	const limit = options?.limit ?? 20;
	const query = options?.query?.trim();
	const excludeIds = options?.excludeIds ?? [];
	const includeIds = options?.includeIds ?? [];

	// Build conditions for non-banned users
	// A user is considered banned if banned=true AND (banExpires IS NULL OR banExpires < now())
	const isNotBanned = or(
		sql`${auth.user.banned} IS NOT TRUE`,
		sql`${auth.user.banExpires} IS NOT NULL AND ${auth.user.banExpires} < NOW()`,
	);

	let users: schema.UserSummary[] = [];

	// If we have includeIds, fetch those users first (prioritized tier)
	let prioritizedUsers: schema.UserSummary[] = [];
	if (includeIds.length > 0) {
		prioritizedUsers = await db
			.select(userSummarySelect)
			.from(auth.user)
			.where(and(inArray(auth.user.id, includeIds), isNotBanned));
	}

	// If no query, just return prioritized users (up to limit)
	if (!query) {
		users = prioritizedUsers.slice(0, limit);
		return users;
	}

	// Search users by name/displayName using ILIKE
	const searchCondition = and(
		or(
			sql`${auth.user.name} ILIKE ${`%${query}%`}`,
			sql`${auth.user.displayName} ILIKE ${`%${query}%`}`,
		),
		isNotBanned,
		excludeIds.length > 0 ? sql`${auth.user.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})` : undefined,
	);

	const searchResults = await db
		.select(userSummarySelect)
		.from(auth.user)
		.where(searchCondition)
		.limit(limit);

	// Filter out prioritized users that are already in search results
	const searchResultIds = new Set(searchResults.map(u => u.id));
	const additionalPrioritized = prioritizedUsers.filter(u => !searchResultIds.has(u.id));

	// Combine: prioritized users first, then search results
	users = [...additionalPrioritized, ...searchResults].slice(0, limit);

	return users;
}

/**
 * Returns just the user IDs of all members of an organization.
 * Lightweight function for Redis cache warming.
 *
 * @param orgId - The organization ID.
 * @returns Array of user IDs who are members of the organization.
 */
export async function getOrgMemberUserIds(orgId: string): Promise<string[]> {
	const members = await db.query.member.findMany({
		where: (m) => eq(m.organizationId, orgId),
		columns: { userId: true },
	});
	return members.map((m) => m.userId);
}

/**
 * Returns user IDs of all participants in a task.
 * Includes: task creator, assignees, commenters, and voters.
 * Lightweight function for Redis cache warming.
 *
 * @param taskId - The task ID.
 * @returns Array of user IDs who have participated in the task.
 */
export async function getTaskParticipantUserIds(taskId: string): Promise<string[]> {
	// Get task creator
	const task = await db.query.task.findFirst({
		where: (t) => eq(t.id, taskId),
		columns: { createdBy: true },
	});

	if (!task || !task.createdBy) return [];

	// Use raw SQL to UNION distinct user IDs across participation tables
	const participantQuery = sql`
		SELECT DISTINCT user_id FROM (
			SELECT ${task.createdBy} AS user_id
			UNION
			SELECT user_id FROM task_assignee WHERE task_id = ${taskId}
			UNION
			SELECT created_by AS user_id FROM task_comment WHERE task_id = ${taskId} AND created_by IS NOT NULL
			UNION
			SELECT user_id FROM task_vote WHERE task_id = ${taskId} AND user_id IS NOT NULL
			UNION
			SELECT user_id FROM task_comment_reaction WHERE task_id = ${taskId}
		) AS participants
		WHERE user_id IS NOT NULL
	`;

	const participantRows = await db.execute(participantQuery);
	const participantIds = (participantRows as unknown as Array<{ user_id: string }>).map((r) => r.user_id);

	return participantIds;
}
