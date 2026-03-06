import { and, eq, sql, or, isNull, inArray, count, desc } from "drizzle-orm";
import { type NodeJSON } from "../../schema";
import { taskComment } from "../../schema/taskComment.schema";
import { taskRelation } from "../../schema/taskRelation.schema";
import { taskTimeline } from "../../schema/taskTimeline.schema";
import { db, schema } from "..";
import { userSummaryColumns } from "./index";

/**
 * Retrieves all tasks for a given project including their full label information.
 *
 * @param orgId - The ID of the organization.
 * @param projectId - The project ID for which to fetch tasks.
 * @returns An array of tasks, each enriched with their associated labels.
 *
 * NOTE: The returned objects include `labels` as full `label` objects,
 * not join table rows.
 *
 * @example
 * ```ts
 * const tasks = await getTasksByOrganizationId("org_123");
 * tasks.forEach(task => {
 *   console.log("Task:", task.title);
 *   task.labels.forEach(label =>
 *     console.log(`  Label: ${label.name} - ${label.color}`)
 *   );
 * });
 * ```
 */
export async function getTasksByOrganizationId(
	orgId: string
): Promise<schema.TaskWithLabels[]> {
	const tasks = await db.query.task.findMany({
		where: (t) => eq(t.organizationId, orgId),

		with: {
			labels: {
				with: {
					label: true,
				},
			},
			createdBy: {
				columns: userSummaryColumns,
			},
			assignees: {
				with: {
					user: {
						columns: userSummaryColumns,
					},
				},
			},
			githubIssue: {},
			githubPullRequest: {},
		},

		extras: {
			commentCount: sql<number>`(
                select count(*)
                from ${taskComment} tc
                where tc.task_id = task.id
            )`.as("comment_count"),
		},
	});

	return tasks.map((task) => ({
		...task,
		labels: task.labels.map((l) => l.label),
		assignees: task.assignees.map((a) => a.user),
	})) as schema.TaskWithLabels[];
}

/**
 * Fetches a task by its short numeric identifier within a given project and organization.
 *
 * This query eagerly loads related entities:
 * - `labels` (with the full label object)
 * - `createdBy` (id, name, image only)
 * - `assignees` (with basic user info)
 * - `timeline` (with actor info)
 *
 * The returned task object is normalized so that:
 * - `labels` → an array of label objects (instead of assignment records).
 * - `assignees` → an array of user objects (instead of assignment records).
 *
 * @param orgId - The ID of the organization the task belongs to.
 * @param shortId - The short numeric identifier of the task (e.g. project-scoped).
 * @returns A promise that resolves to the task object with related data, or `null` if not found.
 *
 * @example
 * ```ts
 * const task = await getTaskByShortId("org_123", "proj_456", 42);
 * if (task) {
 *   console.log("Found task:", task.title, "labels:", task.labels);
 * } else {
 *   console.log("Task not found");
 * }
 * ```
 */

/**
 * Normalizes eagerly-loaded relationsAsSource / relationsAsTarget into the
 * unified TaskRelationWithTarget[] format used by the frontend.
 */
function normalizeTaskRelations(
	asSource: { id: string; type: string; targetTask: { id: string; shortId: number | null; title: string | null; status: string }; createdBy?: schema.UserSummary | null }[],
	asTarget: { id: string; type: string; sourceTask: { id: string; shortId: number | null; title: string | null; status: string }; createdBy?: schema.UserSummary | null }[],
): schema.TaskRelationWithTarget[] {
	return [
		...asSource.map((r) => ({
			id: r.id,
			type: r.type as schema.TaskRelationWithTarget["type"],
			direction: "source" as const,
			task: r.targetTask,
			createdBy: r.createdBy ?? null,
		})),
		...asTarget.map((r) => ({
			id: r.id,
			type: r.type as schema.TaskRelationWithTarget["type"],
			direction: "target" as const,
			task: r.sourceTask,
			createdBy: r.createdBy ?? null,
		})),
	];
}

export async function getTaskByShortId(
	orgId: string,
	shortId: number,
	visible?: "public" | "private",
): Promise<schema.TaskWithLabels | null> {
	const task = await db.query.task.findFirst({
		where: (t) =>
			and(
				eq(t.organizationId, orgId),
				eq(t.shortId, shortId),
				visible ? eq(t.visible, visible) : undefined,
			),
		with: {
			labels: {
				with: {
					label: {
						where: visible ? eq(schema.label.visible, visible) : undefined,
					},
				},
			},
			createdBy: { columns: userSummaryColumns },
			assignees: {
				with: { user: { columns: userSummaryColumns } },
			},
			githubIssue: {},
			githubPullRequest: {},
			parent: {
				columns: { id: true, shortId: true, title: true, status: true },
			},
			subtasks: {
				columns: { id: true },
			},
			relationsAsSource: {
				with: {
					targetTask: { columns: { id: true, shortId: true, title: true, status: true } },
					createdBy: { columns: userSummaryColumns },
				},
			},
			relationsAsTarget: {
				with: {
					sourceTask: { columns: { id: true, shortId: true, title: true, status: true } },
					createdBy: { columns: userSummaryColumns },
				},
			},
		},
	});

	if (!task) return null;

	return {
		...task,
		labels: task.labels
			.map((assignment) => assignment.label)
			.filter(Boolean),
		assignees: task.assignees.map((assignment) => assignment.user),
		parent: task.parent ?? null,
		subtaskCount: task.subtasks?.length ?? 0,
		relations: normalizeTaskRelations(task.relationsAsSource, task.relationsAsTarget),
	} as schema.TaskWithLabels;
}

/**
 * Fetches a task by its unique string identifier within a given project and organization.
 *
 * This query eagerly loads related entities:
 * - `labels` (with the full label object)
 * - `createdBy` (id, name, image only)
 * - `assignees` (with basic user info)
 * - `timeline` (with actor info)
 *
 * The returned task object is normalized so that:
 * - `labels` → an array of label objects (instead of assignment records).
 * - `assignees` → an array of user objects (instead of assignment records).
 *
 * @param orgId - The ID of the organization the task belongs to.
 * @param Id - The unique task ID.
 * @returns A promise that resolves to the task object with related data, or `null` if not found.
 *
 * @example
 * ```ts
 * const task = await getTaskById("org_123", "proj_456", "task_abcdef");
 * if (task) {
 *   console.log("Found task:", task.title, "assignees:", task.assignees);
 * } else {
 *   console.log("Task not found");
 * }
 * ```
 */
export async function getTaskById(orgId: string, Id: string) {
	const task = await db.query.task.findFirst({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.id, Id)),
		with: {
			labels: { with: { label: true } },
			createdBy: { columns: userSummaryColumns },
			assignees: {
				with: { user: { columns: userSummaryColumns } },
			},
			githubIssue: {},
			githubPullRequest: {},
			parent: {
				columns: { id: true, shortId: true, title: true, status: true },
			},
			subtasks: {
				columns: { id: true },
			},
			relationsAsSource: {
				with: {
					targetTask: { columns: { id: true, shortId: true, title: true, status: true } },
					createdBy: { columns: userSummaryColumns },
				},
			},
			relationsAsTarget: {
				with: {
					sourceTask: { columns: { id: true, shortId: true, title: true, status: true } },
					createdBy: { columns: userSummaryColumns },
				},
			},
		},
	});
	if (!task) return null;
	return {
		...task,
		labels: task.labels.map((assignment) => assignment.label),
		assignees: task.assignees.map((assignment) => assignment.user),
		parent: task.parent ?? null,
		subtaskCount: task.subtasks?.length ?? 0,
		relations: normalizeTaskRelations(task.relationsAsSource, task.relationsAsTarget),
	};
}

/**
 * Creates a new task in a project, automatically assigning
 * the next available shortId scoped to that project.
 *
 * @param orgId - The organization ID the task belongs to.
 * @param projectId - The project ID the task belongs to.
 * @param createdBy - The user ID who is creating (or null for anonymous).
 * @param data - The task properties (title, description, status, priority, category).
 * @returns The newly created task row.
 *
 * @example
 * ```ts
 * const task = await createTaskWithShortId(
 *   "org_1",
 *   "proj_123",
 *   user.id,
 *   {
 *     title: "Fix login bug",
 *     description: [],
 *     status: "todo",
 *     priority: "high"
 *     category:"",
 *   }
 * );
 * console.log(task.shortId); // 1, 2, 3, ...
 * ```
 */
export async function createTask(
	orgId: string,
	data: {
		title: string;
		description?: NodeJSON;
		status?: schema.taskType["status"];
		priority?: schema.taskType["priority"];
		category?: schema.taskType["category"];
		releaseId?: string | null;
		visible?: schema.taskType["visible"];
	},
	createdBy?: string | null
) {
	// Get highest existing shortId for this project
	const [max] = (await db
		.select({ max: sql<number>`MAX(${schema.task.shortId})` })
		.from(schema.task)
		.where(eq(schema.task.organizationId, orgId))) || [{ max: 0 }];

	const nextShortId = (max?.max ?? 0) + 1;

	// Insert the new task
	const [task] = await db
		.insert(schema.task)
		.values({
			organizationId: orgId,
			shortId: nextShortId,
			title: data.title,
			description: data.description,
			status: data.status ?? "todo",
			priority: data.priority ?? "none",
			category: data.category || null,
			releaseId: data.releaseId ?? null,
			createdBy: createdBy, // nullable for ANONYMOUS
			visible: data.visible ?? "public",
		})
		.returning();
	return task;
}

/**
 * Logs a timeline event for a task.
 *
 * @param params - taskId, orgId, actorId, eventType, optional from/to values, comment
 */
export async function addLogEventTask(
	task_id: string,
	org_id: string,
	type: (typeof schema.timelineEventTypeEnum.enumValues)[number],
	fromValue?: unknown,
	toValue?: unknown,
	actorId?: string,
	content?: NodeJSON
) {
	const [event] = await db
		.insert(taskTimeline)
		.values({
			taskId: task_id,
			organizationId: org_id,
			actorId: actorId ?? null,
			eventType: type,
			fromValue: fromValue ? JSON.stringify(fromValue) : null,
			toValue: toValue ? JSON.stringify(toValue) : null,
			content: content ?? null,
		})
		.returning({ id: taskTimeline.id });

	return event;
}

export async function createComment(
	org_id: string,
	task_id: string,
	content: NodeJSON,
	visibility: schema.taskCommentType["visibility"],
	createdBy?: string,
	source?: string,
	externalAuthorLogin?: string,
	externalAuthorUrl?: string,
	externalIssueNumber?: string,
	externalCommentId?: string,
	externalCommentUrl?: string,
	parentId?: string | null
) {
	const [newComment] = await db
		.insert(taskComment)
		.values({
			organizationId: org_id,
			taskId: task_id,
			content,
			visibility,
			createdBy,
			source: source ?? "sayr",
			externalAuthorLogin,
			externalAuthorUrl,
			externalIssueNumber,
			externalCommentId,
			externalCommentUrl,
			parentId: parentId ?? null,
		})
		.returning();

	// Note: We don't record the initial version in history.
	// History only tracks edits (the content BEFORE each edit).
	// The current content is always available from the comment itself.

	return newComment;
}

/**
 * Fetches paginated comments for a given task.
 *
 * Performs two queries:
 * 1. Retrieves paginated comments for the specified task
 *    (including basic creator info).
 * 2. Counts the total number of comments for pagination metadata.
 *
 * This does **not** fetch task metadata like title or ID.
 *
 * @param orgId - The organization ID the task belongs to.
 * @param projectId - The project ID the task belongs to.
 * @param taskId - The unique task ID.
 * @param options - Pagination settings (`offset`, `limit`).
 * @returns An object containing comments and total count, or `null` if no comments exist.
 *
 * @example
 * ```ts
 * import { getTaskComments } from "@/db/tasks";
 *
 * const result = await getTaskComments(
 *   "org_123",
 *   "proj_456",
 *   "task_789",
 *   { offset: 0, limit: 5 }
 * );
 *
 * if (result) {
 *   console.log(`Showing ${result.comments.length} of ${result.totalComments} comments`);
 *   result.comments.forEach(c => {
 *     console.log(`${c.createdBy.name}: ${c.content}`);
 *   });
 * } else {
 *   console.log("No comments found");
 * }
 * ```
 */
export async function getTaskComments(
	orgId: string,
	taskId: string,
	{ offset = 0, limit = 10 }: { offset?: number; limit?: number } = {}
) {
	// Step 1: Paginated TOP-LEVEL comments only (parentId IS NULL)
	const comments = await db.query.taskComment.findMany({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.taskId, taskId), isNull(t.parentId)),
		with: {
			createdBy: { columns: userSummaryColumns },
		},
		orderBy: (c, { desc }) => [desc(c.createdAt)],
		limit,
		offset,
	});

	// Step 2: Count total top-level comments (for pagination UI)
	const totalCommentsResult = await db.query.taskComment.findMany({
		where: (c) => and(eq(c.organizationId, orgId), eq(c.taskId, taskId), isNull(c.parentId)),
		columns: { id: true },
	});
	const totalComments = totalCommentsResult.length;

	if (comments.length === 0) return null;

	// Step 3: Batch-fetch reply counts and latest reply authors for these comments
	const commentIds = comments.map((c) => c.id);
	const replyData = await getCommentReplyCountBatch(orgId, commentIds);

	const commentsWithReplies = comments.map((comment) => {
		const data = replyData.get(comment.id);
		return {
			...comment,
			parentId: comment.parentId ?? null,
			replyCount: data?.replyCount ?? 0,
			latestReplyAuthor: data?.latestReplyAuthor ?? null,
			replyAuthors: data?.replyAuthors ?? [],
		};
	});

	return { comments: commentsWithReplies, totalComments };
}

/**
 * Fetches paginated replies for a given parent comment.
 *
 * @param orgId - The organization ID.
 * @param commentId - The parent comment ID to fetch replies for.
 * @param options - Pagination settings (`offset`, `limit`).
 * @returns An object containing replies and total reply count, or `null` if no replies exist.
 */
export async function getCommentReplies(
	orgId: string,
	commentId: string,
	{ offset = 0, limit = 50 }: { offset?: number; limit?: number } = {}
) {
	const replies = await db.query.taskComment.findMany({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.parentId, commentId)),
		with: {
			createdBy: { columns: userSummaryColumns },
		},
		orderBy: (c, { asc }) => [asc(c.createdAt)],
		limit,
		offset,
	});

	const totalRepliesResult = await db.query.taskComment.findMany({
		where: (c) => and(eq(c.organizationId, orgId), eq(c.parentId, commentId)),
		columns: { id: true },
	});
	const totalReplies = totalRepliesResult.length;

	if (replies.length === 0) return null;

	return { replies, totalReplies };
}

/**
 * Batch-fetches reply counts and latest reply author for multiple parent comment IDs.
 * Used by getTaskComments() to enrich top-level comments with thread metadata.
 *
 * @param orgId - The organization ID.
 * @param commentIds - Array of parent comment IDs.
 * @returns A Map of commentId -> { replyCount, latestReplyAuthor }.
 */
export async function getCommentReplyCountBatch(
	orgId: string,
	commentIds: string[]
): Promise<Map<string, { replyCount: number; latestReplyAuthor: schema.UserSummary | null; replyAuthors: schema.UserSummary[] }>> {
	const result = new Map<string, { replyCount: number; latestReplyAuthor: schema.UserSummary | null; replyAuthors: schema.UserSummary[] }>();

	if (commentIds.length === 0) return result;

	// Get reply counts per parent
	const replyCounts = await db
		.select({
			parentId: taskComment.parentId,
			replyCount: count(taskComment.id),
		})
		.from(taskComment)
		.where(and(eq(taskComment.organizationId, orgId), inArray(taskComment.parentId, commentIds)))
		.groupBy(taskComment.parentId);

	// For parents that have replies, get the latest reply and unique authors
	const parentIdsWithReplies = replyCounts
		.filter((r) => r.replyCount > 0 && r.parentId !== null)
		.map((r) => r.parentId as string);

	const latestReplies: Array<{
		parentId: string | null;
		createdBy: schema.UserSummary | null;
	}> = [];

	// Map of parentId -> unique reply authors (deduplicated, max 5)
	const replyAuthorsMap = new Map<string, schema.UserSummary[]>();

	if (parentIdsWithReplies.length > 0) {
		for (const parentId of parentIdsWithReplies) {
			// Fetch recent replies with authors to extract unique participants
			const replies = await db.query.taskComment.findMany({
				where: (t) => and(eq(t.organizationId, orgId), eq(t.parentId, parentId)),
				with: {
					createdBy: { columns: userSummaryColumns },
				},
				orderBy: (c, { desc }) => [desc(c.createdAt)],
			});

			if (replies.length > 0) {
				const latestReply = replies[0]!;
				latestReplies.push({
					parentId: latestReply.parentId,
					createdBy: latestReply.createdBy,
				});

				// Deduplicate authors by id, preserve most-recent-first order
				const seen = new Set<string>();
				const uniqueAuthors: schema.UserSummary[] = [];
				for (const reply of replies) {
					if (reply.createdBy && !seen.has(reply.createdBy.id)) {
						seen.add(reply.createdBy.id);
						uniqueAuthors.push(reply.createdBy);
						if (uniqueAuthors.length >= 5) break;
					}
				}
				replyAuthorsMap.set(parentId, uniqueAuthors);
			}
		}
	}

	// Build the result map
	for (const rc of replyCounts) {
		if (rc.parentId === null) continue;
		const latestReply = latestReplies.find((r) => r.parentId === rc.parentId);
		result.set(rc.parentId, {
			replyCount: rc.replyCount,
			latestReplyAuthor: latestReply?.createdBy ?? null,
			replyAuthors: replyAuthorsMap.get(rc.parentId) ?? [],
		});
	}

	return result;
}

export async function getTaskTimeline(orgId: string, taskId: string) {
	const timeline = await db.query.taskTimeline.findMany({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.taskId, taskId)),
		with: {
			actor: { columns: userSummaryColumns },
		},
		orderBy: (c, { asc }) => [asc(c.createdAt)],
	});
	return timeline;
}

export async function getMergedTaskActivity(orgId: string, taskId: string, isPublic: boolean) {
	const commentConditions = [
		eq(schema.taskComment.organizationId, orgId),
		eq(schema.taskComment.taskId, taskId),
		isNull(schema.taskComment.parentId),
		...(isPublic ? [eq(schema.taskComment.visibility, "public")] : []),
	];
	// Fetch both datasets in parallel for efficiency
	const [timeline, comments] = await Promise.all([
		getTaskTimeline(orgId, taskId),
		await db.query.taskComment.findMany({
			where: () => and(...commentConditions),
			with: {
				createdBy: { columns: userSummaryColumns },
			},
			orderBy: (c, { desc }) => [desc(c.createdAt)],
		}),
	]);

	// Normalize data into a consistent format
	const normalizedTimeline = timeline.map((item) => ({
		id: item.id,
		createdAt: item.createdAt,
		actor: item.actor,
		eventType: item.eventType,
		fromValue: item.fromValue,
		toValue: item.toValue,
		content: item.content,
	}));

	const normalizedComments = comments.map((comment) => ({
		id: comment.id,
		createdAt: comment.createdAt,
		actor: comment.createdBy,
		eventType: "comment" as const,
		content: comment.content,
		visibility: comment.visibility,
	}));

	// Merge and sort chronologically (oldest → newest)
	const merged = [...normalizedTimeline, ...normalizedComments].sort((a, b) => {
		const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
		const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
		return timeA - timeB;
	});

	return merged;
}

/**
 * Retrieves all tasks assigned to a specific user across all organizations and projects.
 *
 * @param userId - The ID of the user to fetch tasks for.
 * @returns An array of tasks assigned to the user, each enriched with their associated labels, assignees, organization and project info.
 *
 * @example
 * ```ts
 * const myTasks = await getTasksByUserId("user_123");
 * myTasks.forEach(task => {
 *   console.log("Task:", task.title, "Project:", task.project?.name);
 * });
 * ```
 */
export async function getTasksByUserId(userId: string): Promise<schema.TaskWithLabels[]> {
	const tasks = await db.query.task.findMany({
		where: (t) =>
			sql`EXISTS (
				SELECT 1 FROM task_assignee
				WHERE task_assignee.task_id = ${t.id}
				AND task_assignee.user_id = ${userId}
			)`,
		with: {
			labels: {
				with: {
					label: true,
				},
			},
			createdBy: {
				columns: userSummaryColumns,
			},
			assignees: {
				with: {
					user: {
						columns: userSummaryColumns,
					},
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
			githubIssue: {},
			githubPullRequest: {},
		},
		orderBy: (t, { desc }) => [desc(t.createdAt)],
	});

	// 🧹 map join rows into clean labels and assignees arrays
	return tasks.map((task) => ({
		...task,
		labels: task.labels.map((assignment) => assignment.label),
		assignees: task.assignees.map((assignment) => assignment.user),
	})) as schema.TaskWithLabels[];
}

/**
 * Searches tasks across all organizations a user belongs to by title.
 * Returns a limited set of results for use in the command palette.
 *
 * @param userId - The ID of the user performing the search
 * @param query - The search query string to match against task titles
 * @param limit - Maximum number of results to return (default: 10)
 * @returns An array of matching tasks with org metadata
 */
export async function searchTasksForUser(
	userId: string,
	query: string,
	limit = 10,
): Promise<
	{
		id: string;
		title: string | null;
		shortId: number | null;
		status: string;
		priority: string;
		organizationId: string;
		organizationName: string | null;
		organizationSlug: string | null;
	}[]
> {
	if (!query || query.trim().length < 2) return [];

	const searchPattern = `%${query.trim()}%`;

	const results = await db
		.select({
			id: schema.task.id,
			title: schema.task.title,
			shortId: schema.task.shortId,
			status: schema.task.status,
			priority: schema.task.priority,
			organizationId: schema.task.organizationId,
			organizationName: schema.organization.name,
			organizationSlug: schema.organization.slug,
		})
		.from(schema.task)
		.innerJoin(schema.member, and(eq(schema.member.organizationId, schema.task.organizationId), eq(schema.member.userId, userId)))
		.innerJoin(schema.organization, eq(schema.organization.id, schema.task.organizationId))
		.where(sql`${schema.task.title} ILIKE ${searchPattern}`)
		.orderBy(sql`CASE WHEN LOWER(${schema.task.title}) LIKE ${`${query.trim().toLowerCase()}%`} THEN 0 ELSE 1 END`, sql`${schema.task.updatedAt} DESC`)
		.limit(limit);

	return results;
}

/**
 * Org-scoped task search for pickers (parent, subtask, relation targets).
 * When no query is provided, returns recent tasks. When a query is provided,
 * does an ILIKE search on task title with prefix-match priority.
 *
 * Returns minimal fields needed for picker display.
 */
export async function searchTasksByOrganization(
	orgId: string,
	query?: string,
	limit = 20,
	offset = 0,
): Promise<
	{
		id: string;
		title: string | null;
		shortId: number | null;
		status: string;
		priority: string;
		parentId: string | null;
		subtaskCount: number | null;
	}[]
> {
	const clampedLimit = Math.min(Math.max(limit, 1), 50);

	const conditions = [eq(schema.task.organizationId, orgId)];

	if (query && query.trim().length >= 2) {
		const searchPattern = `%${query.trim()}%`;
		conditions.push(sql`${schema.task.title} ILIKE ${searchPattern}`);
	}

	const results = await db
		.select({
			id: schema.task.id,
			title: schema.task.title,
			shortId: schema.task.shortId,
			status: schema.task.status,
			priority: schema.task.priority,
			parentId: schema.task.parentId,
			subtaskCount: sql<number>`(SELECT COUNT(*) FROM task AS child WHERE child.parent_id = ${schema.task.id})`.as("subtask_count"),
		})
		.from(schema.task)
		.where(and(...conditions))
		.orderBy(
			...(query && query.trim().length >= 2
				? [sql`CASE WHEN LOWER(${schema.task.title}) LIKE ${`${query.trim().toLowerCase()}%`} THEN 0 ELSE 1 END`]
				: []),
			desc(schema.task.updatedAt),
		)
		.limit(clampedLimit)
		.offset(offset);

	return results;
}

export async function createOrToggleCommentReaction(
	orgId: string,
	taskId: string,
	commentId: string,
	emoji: string,
	userId: string
) {
	if (!orgId || !taskId || !commentId || !userId) {
		throw new Error(`Missing params: orgId=${orgId}, taskId=${taskId}, commentId=${commentId}, userId=${userId}`);
	}
	// Check if the reaction already exists
	const existing = await db
		.select()
		.from(schema.taskCommentReaction)
		.where(
			and(
				eq(schema.taskCommentReaction.organizationId, orgId),
				eq(schema.taskCommentReaction.taskId, taskId),
				eq(schema.taskCommentReaction.commentId, commentId),
				eq(schema.taskCommentReaction.userId, userId),
				eq(schema.taskCommentReaction.emoji, emoji)
			)
		);

	if (existing.length) {
		// Remove reaction if already exists (toggle off)
		await db
			.delete(schema.taskCommentReaction)
			.where(
				and(
					eq(schema.taskCommentReaction.organizationId, orgId),
					eq(schema.taskCommentReaction.taskId, taskId),
					eq(schema.taskCommentReaction.commentId, commentId),
					eq(schema.taskCommentReaction.userId, userId),
					eq(schema.taskCommentReaction.emoji, emoji)
				)
			);

		return { added: false };
	}

	// Otherwise, insert new reaction
	await db
		.insert(schema.taskCommentReaction)
		.values({
			commentId,
			userId,
			emoji,
			createdAt: new Date(),
			taskId,
			organizationId: orgId,
		})
		.returning({ id: schema.taskCommentReaction.id });

	return { added: true };
}

/**
 * Get all reactions for a comment including
 * which users reacted with which emoji.
 */
export async function getCommentReactionsWithUsers(organizationId: string, taskId: string, commentId: string) {
	// Fetch raw rows: one row per (emoji, user)
	const rows = await db
		.select({
			emoji: schema.taskCommentReaction.emoji,
			userId: schema.taskCommentReaction.userId,
		})
		.from(schema.taskCommentReaction)
		.where(
			and(
				eq(schema.taskCommentReaction.organizationId, organizationId),
				eq(schema.taskCommentReaction.taskId, taskId),
				eq(schema.taskCommentReaction.commentId, commentId)
			)
		);

	// Transform into { emoji: { count, users: [] } }
	const summary: Record<string, { count: number; users: string[] }> = {};

	for (const row of rows) {
		if (!summary[row.emoji]) {
			summary[row.emoji] = { count: 0, users: [] };
		}
		const reactionData = summary[row.emoji];
		if (reactionData) {
			reactionData.count += 1;
			reactionData.users.push(row.userId);
		}
	}

	const total = rows.length;

	return {
		commentId,
		total,
		reactions: summary,
	};
}

export async function createOrToggleTaskVote({
	orgId,
	taskId,
	userId,
	anonHash,
}: {
	orgId: string;
	taskId: string;
	userId: string | null;
	anonHash: string | null;
}) {
	return db.transaction(async (tx) => {
		const existing = await tx.query.taskVote.findFirst({
			where: and(
				eq(schema.taskVote.taskId, taskId),
				or(userId ? eq(schema.taskVote.userId, userId) : undefined, eq(schema.taskVote.anonHash, anonHash || ""))
			),
		});

		if (existing) {
			// REMOVE vote
			await tx.delete(schema.taskVote).where(eq(schema.taskVote.id, existing.id));

			await tx
				.update(schema.task)
				.set({
					voteCount: sql`${schema.task.voteCount} - 1`,
				})
				.where(eq(schema.task.id, taskId));

			return { added: false };
		}

		// ADD vote
		await tx.insert(schema.taskVote).values({
			taskId,
			organizationId: orgId,
			userId,
			anonHash,
		});

		await tx
			.update(schema.task)
			.set({
				voteCount: sql`${schema.task.voteCount} + 1`,
			})
			.where(eq(schema.task.id, taskId));

		return { added: true };
	});
}

/* -------------------------------------------------------------------------- */
/*                           Subtask Functions                                */
/* -------------------------------------------------------------------------- */

/**
 * Sets a parent task for a given task, making it a subtask.
 * Enforces single-level nesting: the target parent must not itself be a subtask.
 *
 * @param orgId - The organization ID.
 * @param taskId - The task to make a subtask.
 * @param parentId - The task to set as parent.
 * @returns The updated task row, or throws on validation failure.
 */
export async function setTaskParent(
	orgId: string,
	taskId: string,
	parentId: string,
): Promise<schema.taskType> {
	if (taskId === parentId) {
		throw new Error("A task cannot be its own parent");
	}

	// Validate parent exists in the same org and is not itself a subtask
	const parentTask = await db.query.task.findFirst({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.id, parentId)),
		columns: { id: true, parentId: true },
	});

	if (!parentTask) {
		throw new Error("Parent task not found");
	}

	if (parentTask.parentId !== null) {
		throw new Error("Cannot nest subtasks more than one level deep");
	}

	// Ensure the task being moved doesn't have its own subtasks
	const existingSubtasks = await db.query.task.findFirst({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.parentId, taskId)),
		columns: { id: true },
	});

	if (existingSubtasks) {
		throw new Error("Cannot make a task with subtasks into a subtask");
	}

	const [updated] = await db
		.update(schema.task)
		.set({ parentId, updatedAt: new Date() })
		.where(and(eq(schema.task.organizationId, orgId), eq(schema.task.id, taskId)))
		.returning();

	if (!updated) {
		throw new Error("Task not found");
	}

	return updated;
}

/**
 * Removes the parent from a task, promoting it back to a top-level task.
 *
 * @param orgId - The organization ID.
 * @param taskId - The subtask to promote.
 * @returns The updated task row.
 */
export async function removeTaskParent(
	orgId: string,
	taskId: string,
): Promise<schema.taskType> {
	const [updated] = await db
		.update(schema.task)
		.set({ parentId: null, updatedAt: new Date() })
		.where(and(eq(schema.task.organizationId, orgId), eq(schema.task.id, taskId)))
		.returning();

	if (!updated) {
		throw new Error("Task not found");
	}

	return updated;
}

/**
 * Fetches all subtasks for a given parent task, enriched with labels and assignees.
 *
 * @param orgId - The organization ID.
 * @param parentId - The parent task ID.
 * @returns An array of subtask summaries.
 */
export async function getSubtasks(
	orgId: string,
	parentId: string,
): Promise<schema.SubtaskSummary[]> {
	const subtasks = await db.query.task.findMany({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.parentId, parentId)),
		with: {
			assignees: {
				with: { user: { columns: userSummaryColumns } },
			},
		},
		orderBy: (t, { asc }) => [asc(t.createdAt)],
	});

	return subtasks.map((t) => ({
		id: t.id,
		shortId: t.shortId,
		title: t.title,
		status: t.status,
		priority: t.priority,
		assignees: t.assignees.map((a) => a.user),
	}));
}

/* -------------------------------------------------------------------------- */
/*                        Task Relation Functions                             */
/* -------------------------------------------------------------------------- */

/**
 * Creates a relation between two tasks.
 * Prevents self-relations and duplicate relations.
 *
 * @param orgId - The organization ID.
 * @param sourceTaskId - The source task ID.
 * @param targetTaskId - The target task ID.
 * @param type - The relation type: "related", "blocking", or "duplicate".
 * @param createdBy - The user creating the relation (optional).
 * @returns The newly created task relation row.
 */
export async function createTaskRelation(
	orgId: string,
	sourceTaskId: string,
	targetTaskId: string,
	type: schema.taskRelationType["type"],
	createdBy?: string | null,
): Promise<schema.taskRelationType> {
	if (sourceTaskId === targetTaskId) {
		throw new Error("A task cannot be related to itself");
	}

	// For "related" type, also check the reverse direction to prevent duplicates
	if (type === "related") {
		const existingReverse = await db.query.taskRelation.findFirst({
			where: (r) =>
				and(
					eq(r.organizationId, orgId),
					eq(r.sourceTaskId, targetTaskId),
					eq(r.targetTaskId, sourceTaskId),
					eq(r.type, "related"),
				),
		});

		if (existingReverse) {
			throw new Error("This relation already exists");
		}
	}

	const [relation] = await db
		.insert(taskRelation)
		.values({
			organizationId: orgId,
			sourceTaskId,
			targetTaskId,
			type,
			createdBy: createdBy ?? null,
		})
		.returning();

	if (!relation) {
		throw new Error("Failed to create task relation");
	}

	return relation;
}

/**
 * Removes a task relation by its ID.
 *
 * @param orgId - The organization ID.
 * @param relationId - The relation ID to remove.
 */
export async function removeTaskRelation(
	orgId: string,
	relationId: string,
): Promise<void> {
	const result = await db
		.delete(taskRelation)
		.where(and(eq(taskRelation.organizationId, orgId), eq(taskRelation.id, relationId)))
		.returning({ id: taskRelation.id });

	if (result.length === 0) {
		throw new Error("Task relation not found");
	}
}

/**
 * Fetches all relations for a given task, querying both directions.
 * Returns normalized results with a computed `direction` field so the UI
 * knows whether to display "Blocking" vs "Blocked by", etc.
 *
 * @param orgId - The organization ID.
 * @param taskId - The task to fetch relations for.
 * @returns An array of task relations with target task summaries.
 */
export async function getTaskRelations(
	orgId: string,
	taskId: string,
): Promise<schema.TaskRelationWithTarget[]> {
	// Fetch relations where this task is the source
	const asSource = await db.query.taskRelation.findMany({
		where: (r) => and(eq(r.organizationId, orgId), eq(r.sourceTaskId, taskId)),
		with: {
			targetTask: {
				columns: { id: true, shortId: true, title: true, status: true },
			},
			createdBy: { columns: userSummaryColumns },
		},
	});

	// Fetch relations where this task is the target
	const asTarget = await db.query.taskRelation.findMany({
		where: (r) => and(eq(r.organizationId, orgId), eq(r.targetTaskId, taskId)),
		with: {
			sourceTask: {
				columns: { id: true, shortId: true, title: true, status: true },
			},
			createdBy: { columns: userSummaryColumns },
		},
	});

	const results: schema.TaskRelationWithTarget[] = [
		...asSource.map((r) => ({
			id: r.id,
			type: r.type,
			direction: "source" as const,
			task: r.targetTask,
			createdBy: r.createdBy,
		})),
		...asTarget.map((r) => ({
			id: r.id,
			type: r.type,
			direction: "target" as const,
			task: r.sourceTask,
			createdBy: r.createdBy,
		})),
	];

	return results;
}
