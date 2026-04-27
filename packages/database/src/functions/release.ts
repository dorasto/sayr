import { SQL, and, asc, desc, eq, inArray, isNull, not, or, sql } from "drizzle-orm";
import { db, schema } from "..";
import { getUsersByIds, userSummaryColumns } from "./index";
/**
 * Fetches a single release by its ID.
 *
 * @param releaseId - The unique ID of the release
 * @returns Promise resolving to release data or null if not found
 */
export async function getRelease(releaseId: string): Promise<schema.releaseType | null> {
	const release = await db.query.release.findFirst({
		where: eq(schema.release.id, releaseId),
	});

	return release || null;
}

/**
 * Fetches a release by its slug within an organization.
 *
 * @param orgId - The organization ID
 * @param slug - The release slug
 * @returns Promise resolving to release data or null if not found
 */
export async function getReleaseBySlug(orgId: string, slug: string): Promise<schema.releaseType | null> {
	const release = await db.query.release.findFirst({
		where: and(eq(schema.release.organizationId, orgId), eq(schema.release.slug, slug)),
	});

	return release || null;
}

/**
 * Fetches all releases for an organization, ordered by slug/targetDate.
 *
 * @param orgId - The organization ID
 * @returns Promise resolving to array of releases
 */
export async function getReleases(orgId: string): Promise<schema.releaseType[]> {
	const releases = await db.query.release.findMany({
		where: eq(schema.release.organizationId, orgId),
		orderBy: [
			// Order by targetDate descending (nulls last), then by slug
			desc(schema.release.targetDate),
			asc(schema.release.slug),
		],
	});

	return releases;
}

export type ReleaseStatus = "planned" | "in-progress" | "released" | "archived";

/**
 * Fetches a paginated list of releases for an organization.
 *
 * Sort logic per status:
 *  - planned / in-progress: targetDate ASC NULLS LAST (nearest upcoming first)
 *  - released: releasedAt DESC (most recently shipped first)
 *  - archived: updatedAt DESC
 *
 * @param orgId  - The organization ID
 * @param opts   - Pagination + filter options
 */
export async function getReleasesPage(
	orgId: string,
	opts: {
		page?: number;
		limit?: number;
		status?: ReleaseStatus | "all";
	} = {},
): Promise<{
	releases: schema.releaseType[];
	pagination: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
		hasMore: boolean;
	};
}> {
	const page = Math.max(opts.page ?? 1, 1);
	const limit = Math.min(opts.limit ?? 10, 50);
	const offset = (page - 1) * limit;
	const status = opts.status ?? "all";

	const whereClause =
		status === "all"
			? eq(schema.release.organizationId, orgId)
			: and(eq(schema.release.organizationId, orgId), eq(schema.release.status, status));

	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.release)
		.where(whereClause);

	const totalItems = Number(countResult?.count ?? 0);
	const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

	// Build sort order based on requested status (or default for "all")
	let orderBy: SQL[];
	if (status === "released") {
		orderBy = [desc(schema.release.releasedAt), desc(schema.release.updatedAt)];
	} else if (status === "archived") {
		orderBy = [desc(schema.release.updatedAt)];
	} else {
		// planned, in-progress, or "all" — soonest target date first, nulls last
		orderBy = [
			sql`${schema.release.targetDate} ASC NULLS LAST`,
			asc(schema.release.slug),
		];
	}

	const releases = await db.query.release.findMany({
		where: whereClause,
		orderBy,
		limit,
		offset,
	});

	return {
		releases,
		pagination: {
			page,
			limit,
			totalItems,
			totalPages,
			hasMore: page < totalPages,
		},
	};
}

/**
 * Fetches a release with all its associated tasks, lead, labels, status updates and comments.
 *
 * @param releaseId - The unique ID of the release
 * @returns Promise resolving to release with tasks or null if not found
 */
export async function getReleaseWithTasks(releaseId: string): Promise<schema.ReleaseWithTasks | null> {
	const release = await db.query.release.findFirst({
		where: eq(schema.release.id, releaseId),
	});

	if (!release) {
		return null;
	}

	// Fetch tasks for this release
	const tasks = await db.query.task.findMany({
		where: eq(schema.task.releaseId, releaseId),
		with: {
			labels: {
				with: {
					label: true,
				},
			},
			assignees: {
				with: {
					user: {
						columns: userSummaryColumns,
					},
				},
			},
			createdBy: {
				columns: userSummaryColumns,
			},
		},
	});

	// Transform tasks to TaskWithLabels format
	const tasksWithLabels: schema.TaskWithLabels[] = tasks.map((task) => ({
		...task,
		labels: task.labels.map((l) => l.label),
		assignees: task.assignees.map((a) => a.user),
		description: task.description as schema.NodeJSON,
	}));

	// Get creator info if available
	let createdBy: schema.UserSummary | null = null;
	if (release.createdBy) {
		const creators = await getUsersByIds([release.createdBy]);
		if (creators[0]) {
			createdBy = creators[0];
		}
	}

	// Get lead info if available
	let lead: schema.UserSummary | null = null;
	if (release.leadId) {
		const leads = await getUsersByIds([release.leadId]);
		if (leads[0]) {
			lead = leads[0];
		}
	}

	// Fetch labels
	const labelAssignments = await db.query.releaseLabelAssignment.findMany({
		where: eq(schema.releaseLabelAssignment.releaseId, releaseId),
		with: { label: true },
	});
	const labels = labelAssignments.map((la) => la.label);

	const result: schema.ReleaseWithTasks = {
		...release,
		tasks: tasksWithLabels,
		createdBy,
		lead,
		labels,
	};

	return result;
}

/**
 * Creates a new release.
 *
 * @param data - Release creation data
 * @returns Promise resolving to created release
 */
export async function createRelease(data: {
	id: string;
	organizationId: string;
	name: string;
	slug: string;
	description?: schema.NodeJSON;
	status?: "planned" | "in-progress" | "released" | "archived";
	targetDate?: Date;
	color?: string;
	icon?: string;
	leadId?: string;
	createdBy?: string;
}): Promise<schema.releaseType> {
	const [release] = await db
		.insert(schema.release)
		.values({
			id: data.id,
			organizationId: data.organizationId,
			name: data.name,
			slug: data.slug,
			description: data.description,
			status: data.status || "planned",
			targetDate: data.targetDate,
			color: data.color || "hsla(0, 0%, 0%, 1)",
			icon: data.icon,
			leadId: data.leadId,
			createdBy: data.createdBy,
		})
		.returning();

	if (!release) {
		throw new Error("Failed to create release");
	}

	return release;
}

/**
 * Updates an existing release.
 *
 * @param releaseId - The unique ID of the release to update
 * @param data - Partial release data to update
 * @returns Promise resolving to updated release
 */
export async function updateRelease(
	releaseId: string,
	data: Partial<{
		name: string;
		slug: string;
		description: schema.NodeJSON;
		status: "planned" | "in-progress" | "released" | "archived";
		targetDate: Date | null;
		releasedAt: Date | null;
		color: string;
		icon: string;
		leadId: string | null;
	}>
): Promise<schema.releaseType> {
	const [release] = await db
		.update(schema.release)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(schema.release.id, releaseId))
		.returning();

	if (!release) {
		throw new Error("Failed to update release");
	}

	return release;
}

/**
 * Deletes a release and sets all associated tasks' releaseId to null.
 *
 * @param releaseId - The unique ID of the release to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteRelease(releaseId: string): Promise<void> {
	// First, set all tasks' releaseId to null
	await db.update(schema.task).set({ releaseId: null }).where(eq(schema.task.releaseId, releaseId));

	// Then delete the release
	await db.delete(schema.release).where(eq(schema.release.id, releaseId));
}

/**
 * Marks a release as released and updates all incomplete tasks to "done".
 * Tasks with status "canceled" are not updated.
 *
 * @param releaseId - The unique ID of the release to mark as released
 * @param actorId - The user ID of the person marking the release
 * @returns Promise resolving to updated release and array of updated task IDs
 */
export async function markReleaseAsReleased(
	releaseId: string,
	actorId: string
): Promise<{ release: schema.releaseType; updatedTaskIds: string[] }> {
	// Update the release status
	const [release] = await db
		.update(schema.release)
		.set({
			status: "released",
			releasedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(schema.release.id, releaseId))
		.returning();

	if (!release) {
		throw new Error("Failed to update release status");
	}

	// Find all tasks in this release that are NOT done and NOT canceled
	const tasksToUpdate = await db.query.task.findMany({
		where: and(
			eq(schema.task.releaseId, releaseId),
			not(eq(schema.task.status, "done")),
			not(eq(schema.task.status, "canceled"))
		),
		columns: {
			id: true,
		},
	});

	const taskIds = tasksToUpdate.map((t) => t.id);

	// Update tasks to "done" if there are any
	if (taskIds.length > 0) {
		await db
			.update(schema.task)
			.set({
				status: "done",
				updatedAt: new Date(),
			})
			.where(inArray(schema.task.id, taskIds));
	}

	return {
		release,
		updatedTaskIds: taskIds,
	};
}

// ─── Release Labels ───────────────────────────────────────────────────────────

export async function addReleaseLabel(releaseId: string, organizationId: string, labelId: string): Promise<void> {
	await db
		.insert(schema.releaseLabelAssignment)
		.values({ releaseId, organizationId, labelId })
		.onConflictDoNothing();
}

export async function removeReleaseLabel(releaseId: string, labelId: string): Promise<void> {
	await db
		.delete(schema.releaseLabelAssignment)
		.where(
			and(
				eq(schema.releaseLabelAssignment.releaseId, releaseId),
				eq(schema.releaseLabelAssignment.labelId, labelId)
			)
		);
}

export async function getReleaseLabels(releaseId: string): Promise<schema.labelType[]> {
	const assignments = await db.query.releaseLabelAssignment.findMany({
		where: eq(schema.releaseLabelAssignment.releaseId, releaseId),
		with: { label: true },
	});
	return assignments.map((a) => a.label);
}

// ─── Release Status Updates ───────────────────────────────────────────────────

export async function createReleaseStatusUpdate(data: {
	releaseId: string;
	organizationId: string;
	authorId: string;
	content?: schema.NodeJSON;
	health: "on_track" | "at_risk" | "off_track";
	visibility: "public" | "internal";
}): Promise<schema.releaseStatusUpdateType> {
	const [update] = await db.insert(schema.releaseStatusUpdate).values(data).returning();
	if (!update) throw new Error("Failed to create release status update");
	return update;
}

/**
 * For a batch of status update IDs, fetches up to 3 unique comment authors per update
 * (most-recent-first, deduplicated by user ID). Returns a Map keyed by statusUpdateId.
 */
async function getStatusUpdateCommentAuthors(statusUpdateIds: string[]): Promise<Map<string, schema.UserSummary[]>> {
	const result = new Map<string, schema.UserSummary[]>();
	if (statusUpdateIds.length === 0) return result;

	const MAX_VISIBLE = 3;

	for (const updateId of statusUpdateIds) {
		const comments = await db.query.releaseComment.findMany({
			where: and(eq(schema.releaseComment.statusUpdateId, updateId), isNull(schema.releaseComment.parentId)),
			with: {
				createdBy: { columns: userSummaryColumns },
			},
			orderBy: (c, { desc }) => [desc(c.createdAt)],
		});

		const seen = new Set<string>();
		const authors: schema.UserSummary[] = [];
		for (const c of comments) {
			if (c.createdBy && !seen.has(c.createdBy.id)) {
				seen.add(c.createdBy.id);
				authors.push(c.createdBy);
				if (authors.length >= MAX_VISIBLE) break;
			}
		}
		result.set(updateId, authors);
	}

	return result;
}

export async function getReleaseStatusUpdates(
	releaseId: string,
	visibility?: "public" | "internal" | "all"
): Promise<schema.ReleaseStatusUpdateWithAuthor[]> {
	const updates = await db.query.releaseStatusUpdate.findMany({
		where:
			!visibility || visibility === "all"
				? eq(schema.releaseStatusUpdate.releaseId, releaseId)
				: and(
						eq(schema.releaseStatusUpdate.releaseId, releaseId),
						eq(schema.releaseStatusUpdate.visibility, visibility)
					),
		orderBy: [desc(schema.releaseStatusUpdate.createdAt)],
		with: {
			author: { columns: userSummaryColumns },
		},
	});

	if (updates.length === 0) return [];

	const updateIds = updates.map((u) => u.id);
	const counts = await db
		.select({
			statusUpdateId: schema.releaseComment.statusUpdateId,
			count: sql<number>`cast(count(*) as int)`,
		})
		.from(schema.releaseComment)
		.where(inArray(schema.releaseComment.statusUpdateId, updateIds))
		.groupBy(schema.releaseComment.statusUpdateId);

	const countMap = new Map(counts.map((c) => [c.statusUpdateId, c.count]));

	// Fetch up to 3 unique comment authors per status update (most recent first)
	const authorsMap = await getStatusUpdateCommentAuthors(updateIds);

	return updates.map((u) => ({
		...u,
		author: u.author ?? null,
		commentCount: countMap.get(u.id) ?? 0,
		commentAuthors: authorsMap.get(u.id) ?? [],
	}));
}

export async function updateReleaseStatusUpdate(
	updateId: string,
	data: Partial<{
		content: schema.NodeJSON;
		health: "on_track" | "at_risk" | "off_track";
		visibility: "public" | "internal";
	}>
): Promise<schema.releaseStatusUpdateType> {
	const [updated] = await db
		.update(schema.releaseStatusUpdate)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(schema.releaseStatusUpdate.id, updateId))
		.returning();
	if (!updated) throw new Error("Failed to update release status update");
	return updated;
}

export async function deleteReleaseStatusUpdate(updateId: string): Promise<void> {
	await db.delete(schema.releaseStatusUpdate).where(eq(schema.releaseStatusUpdate.id, updateId));
}

// ─── Release Comments ─────────────────────────────────────────────────────────

export async function createReleaseComment(data: {
	releaseId: string;
	organizationId: string;
	createdBy: string;
	content: schema.NodeJSON;
	visibility: "public" | "internal";
	statusUpdateId?: string;
	parentId?: string;
}): Promise<schema.releaseCommentType> {
	const [comment] = await db.insert(schema.releaseComment).values(data).returning();
	if (!comment) throw new Error("Failed to create release comment");
	return comment;
}

export async function getReleaseComments(
	releaseId: string,
	opts: {
		statusUpdateId?: string | null;
		visibility?: "public" | "internal" | "all";
		limit?: number;
		offset?: number;
		direction?: "asc" | "desc";
		topLevelOnly?: boolean;
	} = {}
): Promise<{ comments: schema.ReleaseCommentWithAuthor[]; total: number }> {
	const conditions = [eq(schema.releaseComment.releaseId, releaseId)];

	if (opts.statusUpdateId !== undefined) {
		conditions.push(
			opts.statusUpdateId === null
				? isNull(schema.releaseComment.statusUpdateId)
				: eq(schema.releaseComment.statusUpdateId, opts.statusUpdateId)
		);
	}

	if (opts.visibility && opts.visibility !== "all") {
		conditions.push(eq(schema.releaseComment.visibility, opts.visibility));
	}

	if (opts.topLevelOnly) {
		conditions.push(isNull(schema.releaseComment.parentId));
	}

	const whereClause = and(...conditions);

	// Run count and data fetch in parallel
	const [countResult, rows] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(schema.releaseComment)
			.where(whereClause)
			.then((r) => r[0]?.count ?? 0),
		db.query.releaseComment.findMany({
			where: whereClause,
			orderBy: opts.direction === "desc"
				? [desc(schema.releaseComment.createdAt)]
				: [asc(schema.releaseComment.createdAt)],
			limit: opts.limit,
			offset: opts.offset,
			with: {
				createdBy: { columns: userSummaryColumns },
				reactions: true,
			},
		}),
	]);

	// If topLevelOnly, enrich with reply metadata
	let comments = rows.map((c) => ({
		...c,
		createdBy: c.createdBy ?? null,
		content: c.content as schema.NodeJSON,
		reactions: buildReactionSummary(c.reactions),
	}));

	if (opts.topLevelOnly && comments.length > 0) {
		const commentIds = comments.map((c) => c.id);
		const replyData = await getReleaseCommentReplyCountBatch(releaseId, commentIds);
		comments = comments.map((comment) => {
			const data = replyData.get(comment.id);
			return {
				...comment,
				replyCount: data?.replyCount ?? 0,
				replyAuthors: data?.replyAuthors ?? [],
			};
		});
	}

	return {
		comments,
		total: countResult,
	};
}

function buildReactionSummary(reactions: schema.releaseCommentReactionType[]): schema.ReleaseCommentWithAuthor["reactions"] {
	if (!reactions.length) return { total: 0, reactions: {} };
	const map: Record<string, { count: number; users: string[] }> = {};
	for (const r of reactions) {
		const entry = map[r.emoji];
		if (!entry) {
			map[r.emoji] = { count: 1, users: [r.userId] };
		} else {
			entry.count++;
			entry.users.push(r.userId);
		}
	}
	return { total: reactions.length, reactions: map };
}

/**
 * Fetches reply counts and authors for a batch of top-level release comments.
 * @param releaseId - The release ID
 * @param commentIds - Array of top-level comment IDs
 * @returns A Map of commentId -> { replyCount, replyAuthors }
 */
export async function getReleaseCommentReplyCountBatch(
	releaseId: string,
	commentIds: string[]
): Promise<Map<string, { replyCount: number; replyAuthors: schema.UserSummary[] }>> {
	const result = new Map<string, { replyCount: number; replyAuthors: schema.UserSummary[] }>();

	if (commentIds.length === 0) return result;

	// Get reply counts per parent
	const replyCounts = await db
		.select({
			parentId: schema.releaseComment.parentId,
			replyCount: sql<number>`count(*)::int`,
		})
		.from(schema.releaseComment)
		.where(and(eq(schema.releaseComment.releaseId, releaseId), inArray(schema.releaseComment.parentId, commentIds)))
		.groupBy(schema.releaseComment.parentId);

	// Initialize all comment IDs with zero counts
	for (const id of commentIds) {
		result.set(id, { replyCount: 0, replyAuthors: [] });
	}

	// For parents that have replies, get unique authors
	const parentIdsWithReplies = replyCounts
		.filter((r) => r.replyCount > 0 && r.parentId !== null)
		.map((r) => r.parentId as string);

	for (const parentId of parentIdsWithReplies) {
		const countEntry = replyCounts.find((r) => r.parentId === parentId);
		const replyCount = countEntry?.replyCount ?? 0;

		// Fetch replies with authors to extract unique participants
		const replies = await db.query.releaseComment.findMany({
			where: and(
				eq(schema.releaseComment.releaseId, releaseId),
				eq(schema.releaseComment.parentId, parentId)
			),
			with: {
				createdBy: { columns: userSummaryColumns },
			},
			orderBy: (c, { desc }) => [desc(c.createdAt)],
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

		result.set(parentId, { replyCount, replyAuthors: uniqueAuthors });
	}

	return result;
}

/**
 * Fetches all replies for a specific top-level release comment.
 * @param releaseId - The release ID
 * @param parentId - The parent comment ID
 * @returns Array of replies with author and reaction data
 */
export async function getReleaseCommentReplies(
	releaseId: string,
	parentId: string
): Promise<schema.ReleaseCommentWithAuthor[]> {
	const rows = await db.query.releaseComment.findMany({
		where: and(
			eq(schema.releaseComment.releaseId, releaseId),
			eq(schema.releaseComment.parentId, parentId)
		),
		orderBy: [asc(schema.releaseComment.createdAt)],
		with: {
			createdBy: { columns: userSummaryColumns },
			reactions: true,
		},
	});

	return rows.map((c) => ({
		...c,
		createdBy: c.createdBy ?? null,
		content: c.content as schema.NodeJSON,
		reactions: buildReactionSummary(c.reactions),
	}));
}

export async function updateReleaseComment(
	commentId: string,
	data: Partial<{ content: schema.NodeJSON; visibility: "public" | "internal" }>
): Promise<schema.releaseCommentType> {
	const [updated] = await db
		.update(schema.releaseComment)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(schema.releaseComment.id, commentId))
		.returning();
	if (!updated) throw new Error("Failed to update release comment");
	return updated;
}

export async function deleteReleaseComment(commentId: string): Promise<void> {
	await db.delete(schema.releaseComment).where(eq(schema.releaseComment.id, commentId));
}

// ─── Release Comment Reactions ────────────────────────────────────────────────

export async function addReleaseCommentReaction(
	organizationId: string,
	commentId: string,
	userId: string,
	emoji: string
): Promise<void> {
	await db
		.insert(schema.releaseCommentReaction)
		.values({ organizationId, commentId, userId, emoji })
		.onConflictDoNothing();
}

export async function removeReleaseCommentReaction(commentId: string, userId: string, emoji: string): Promise<void> {
	await db
		.delete(schema.releaseCommentReaction)
		.where(
			and(
				eq(schema.releaseCommentReaction.commentId, commentId),
				eq(schema.releaseCommentReaction.userId, userId),
				eq(schema.releaseCommentReaction.emoji, emoji)
			)
		);
}
