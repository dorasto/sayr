import { and, eq, sql, or } from "drizzle-orm";
import { taskCommentHistory, type NodeJSON } from "../../schema";
import { taskComment } from "../../schema/taskComment.schema";
import { taskTimeline } from "../../schema/taskTimeline.schema";
import { db, schema } from "..";

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
  orgId: string,
): Promise<schema.TaskWithLabels[]> {
  const tasks = await db.query.task.findMany({
    where: (t) => and(eq(t.organizationId, orgId)),
    with: {
      labels: {
        with: {
          label: true, // 👈 eager load the real label object
        },
      },
      createdBy: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      assignees: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      comments: {
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      githubIssue: {},
    },
  });

  // 🧹 map join rows into clean labels array
  return tasks.map((task) => ({
    ...task,
    labels: task.labels.map((assignment) => assignment.label),
    assignees: task.assignees.map((assignment) => assignment.user),
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
export async function getTaskByShortId(
  orgId: string,
  shortId: number,
): Promise<schema.TaskWithLabels | null> {
  const task = await db.query.task.findFirst({
    where: (t) => and(eq(t.organizationId, orgId), eq(t.shortId, shortId)),
    with: {
      labels: { with: { label: true } },
      createdBy: { columns: { id: true, name: true, image: true } },
      assignees: {
        with: { user: { columns: { id: true, name: true, image: true } } },
      },
      githubIssue: {},
    },
  });
  if (!task) return null;
  return {
    ...task,
    labels: task.labels.map((assignment) => assignment.label),
    assignees: task.assignees.map((assignment) => assignment.user),
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
      createdBy: { columns: { id: true, name: true, image: true } },
      assignees: {
        with: { user: { columns: { id: true, name: true, image: true } } },
      },
      githubIssue: {},
    },
  });
  if (!task) return null;
  return {
    ...task,
    labels: task.labels.map((assignment) => assignment.label),
    assignees: task.assignees.map((assignment) => assignment.user),
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
  },
  createdBy?: string | null,
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
      createdBy: createdBy, // nullable for ANONYMOUS
      visible: "public",
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
  content?: NodeJSON,
) {
  return await db.insert(taskTimeline).values({
    taskId: task_id,
    organizationId: org_id,
    actorId: actorId ?? null,
    eventType: type,
    fromValue: fromValue ? JSON.stringify(fromValue) : null,
    toValue: toValue ? JSON.stringify(toValue) : null,
    content: content ?? null,
  });
}

export async function createComment(
  org_id: string,
  task_id: string,
  content: NodeJSON,
  visibility: schema.taskCommentType["visibility"],
  createdBy?: string,
) {
  const [newComment] = await db
    .insert(taskComment)
    .values({
      organizationId: org_id,
      taskId: task_id,
      content,
      visibility,
      createdBy,
    })
    .returning();

  // Record the initial version in history
  if (newComment) {
    await db.insert(taskCommentHistory).values({
      organizationId: org_id,
      taskId: task_id,
      commentId: newComment.id,
      editedBy: createdBy,
      content: content,
    });
  }

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
  { offset = 0, limit = 10 }: { offset?: number; limit?: number } = {},
) {
  // Step 1: Paginated comments
  const comments = await db.query.taskComment.findMany({
    where: (t) => and(eq(t.organizationId, orgId), eq(t.taskId, taskId)),
    with: {
      createdBy: { columns: { id: true, name: true, image: true } },
    },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit,
    offset,
  });

  // Step 2: Count total comments (for pagination UI)
  const totalCommentsResult = await db.query.taskComment.findMany({
    where: (c) => and(eq(c.organizationId, orgId), eq(c.taskId, taskId)),
    columns: { id: true },
  });
  const totalComments = totalCommentsResult.length;

  if (comments.length === 0) return null;

  return { comments, totalComments };
}

export async function getTaskTimeline(orgId: string, taskId: string) {
  const timeline = await db.query.taskTimeline.findMany({
    where: (t) => and(eq(t.organizationId, orgId), eq(t.taskId, taskId)),
    with: {
      actor: { columns: { id: true, name: true, image: true } },
    },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });
  return timeline;
}

export async function getMergedTaskActivity(
  orgId: string,
  taskId: string,
  isPublic: boolean,
) {
  const commentConditions = [
    eq(schema.taskComment.organizationId, orgId),
    eq(schema.taskComment.taskId, taskId),
    ...(isPublic ? [eq(schema.taskComment.visibility, "public")] : []),
  ];
  // Fetch both datasets in parallel for efficiency
  const [timeline, comments] = await Promise.all([
    getTaskTimeline(orgId, taskId),
    await db.query.taskComment.findMany({
      where: () => and(...commentConditions),
      with: {
        createdBy: { columns: { id: true, name: true, image: true } },
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
export async function getTasksByUserId(
  userId: string,
): Promise<schema.TaskWithLabels[]> {
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
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      assignees: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
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

export async function createOrToggleCommentReaction(
  orgId: string,
  taskId: string,
  commentId: string,
  emoji: string,
  userId: string,
) {
  if (!orgId || !taskId || !commentId || !userId) {
    throw new Error(
      `Missing params: orgId=${orgId}, taskId=${taskId}, commentId=${commentId}, userId=${userId}`,
    );
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
        eq(schema.taskCommentReaction.emoji, emoji),
      ),
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
          eq(schema.taskCommentReaction.emoji, emoji),
        ),
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
export async function getCommentReactionsWithUsers(
  organizationId: string,
  taskId: string,
  commentId: string,
) {
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
        eq(schema.taskCommentReaction.commentId, commentId),
      ),
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
        or(
          userId ? eq(schema.taskVote.userId, userId) : undefined,
          eq(schema.taskVote.anonHash, anonHash || "")
        ),
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