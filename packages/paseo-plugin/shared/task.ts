import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

// Every RPC wire name must match /^[a-z][a-z0-9._-]*$/ (dotted, lowercase) —
// camelCase load-fails the whole plugin.

export const TASK_STATUSES = ["backlog", "todo", "in-progress", "done", "canceled"] as const;
export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

const PersonSchema = z
	.looseObject({
		id: z.string(),
		name: z.string().nullable().optional(),
		image: z.string().nullable().optional(),
	})
	.nullable();

const LabelSchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	color: z.string().nullable().optional(),
});

/**
 * Neither `sayr task list` nor `sayr task view` actually expands the category
 * relation server-side (`getTaskById` / `me/tasks.ts`'s list query don't
 * include it in their `with:` clause) — the CLI's own `Category` type in
 * `packages/cli/src/types.ts` is aspirational, not what the API returns. The
 * real value is the raw category id column, a plain string. Accepting both
 * shapes defensively rather than assuming the CLI's declared (wrong) type.
 */
const CategorySchema = z
	.union([z.string(), z.looseObject({ id: z.string(), name: z.string() })])
	.nullable()
	.optional();

const OrgMemberSchema = z.looseObject({
	userId: z.string(),
	user: z.looseObject({
		id: z.string(),
		name: z.string().nullable().optional(),
		image: z.string().nullable().optional(),
	}),
});

/** Mirrors `packages/cli/src/types.ts`'s `Organization`. */
export const OrgSchema = z.looseObject({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	/** Task-key prefix, e.g. "SAY" in "SAY-123" — see `formatTaskKey` below. */
	shortId: z.string(),
	members: z.array(OrgMemberSchema).default([]),
});
export type Org = z.output<typeof OrgSchema>;

/** Local copy of `packages/util/src/index.ts`'s `formatTaskKey` — see the note on `extractPlainText` in `shared/prosekit.ts` for why this isn't an import. */
export function formatTaskKey(orgShortId: string, taskShortId: number | null | undefined): string {
	return `${orgShortId}-${taskShortId ?? "?"}`;
}

/** A category name to display, or `undefined` when all we have is the unresolved id string — see `CategorySchema`. */
export function categoryName(category: Task["category"]): string | undefined {
	return category && typeof category === "object" ? category.name : undefined;
}

/**
 * Mirrors `packages/cli/src/types.ts`'s `Task`, loosely — the CLI's `--json`
 * output carries more fields than any one screen needs (relations, subtasks,
 * githubIssue, ...), and `z.looseObject` keeps unknown ones passing through
 * instead of failing validation, matching the backend's own
 * `apps/backend/routes/api/public/v1/me/schemas.ts` convention for the same
 * reason: precision here is a nicety, not the actual contract boundary.
 *
 * `orgId`/`orgSlug`/`orgShortId` are NOT part of the CLI's own task shape —
 * every CLI call is already scoped to one org via `--org`, so its output
 * never says which. The server handler stamps these on after the fact (see
 * `server/task-handlers.ts`), since this plugin fetches every org at once.
 */
export const TaskSchema = z.looseObject({
	id: z.string(),
	shortId: z.number().nullable(),
	title: z.string().nullable(),
	status: z.enum(TASK_STATUSES),
	priority: z.enum(TASK_PRIORITIES),
	description: z.unknown().nullable().optional(),
	category: CategorySchema,
	labels: z.array(LabelSchema).default([]),
	assignees: z.array(PersonSchema).default([]).optional(),
	createdBy: PersonSchema.optional(),
	voteCount: z.number().optional(),
	orgId: z.string(),
	orgSlug: z.string(),
	orgShortId: z.string(),
});
export type Task = z.output<typeof TaskSchema>;

export const CommentSchema = z.looseObject({
	id: z.string(),
	taskId: z.string().nullable().optional(),
	content: z.unknown().nullable().optional(),
	visibility: z.enum(["public", "internal"]),
	createdAt: z.string().nullable().optional(),
	createdBy: PersonSchema.optional(),
	replyCount: z.number().default(0).optional(),
	latestReplyAuthor: PersonSchema.optional(),
	replyAuthors: z.array(PersonSchema).default([]).optional(),
});
export type TaskComment = z.output<typeof CommentSchema>;

export const AiSummarySchema = z
	.looseObject({
		hasCachedSummary: z.boolean(),
		isStale: z.boolean().optional(),
		summary: z.string().nullable(),
		generatedAt: z.string().nullable().optional(),
	})
	.nullable()
	.optional();

const PaginationSchema = z.looseObject({
	page: z.number(),
	totalPages: z.number(),
	totalItems: z.number(),
	hasMore: z.boolean(),
});
export type Pagination = z.output<typeof PaginationSchema>;

export const listOrgsRpc = defineRpc({
	name: "sayr.org.list",
	input: z.object({}),
	output: z.object({ orgs: z.array(OrgSchema) }),
});

export const listTasksRpc = defineRpc({
	name: "sayr.task.list",
	input: z.object({}),
	output: z.object({ tasks: z.array(TaskSchema), orgs: z.array(OrgSchema) }),
});

// Flat, not `{ task, comments }` nested — matches `sayr task view --json`'s
// own shape (`{ ...task, comments, commentsTotal }`) exactly, so the server
// handler is mostly a passthrough rather than a reshaping step.
export const getTaskRpc = defineRpc({
	name: "sayr.task.get",
	// `orgSlug` disambiguates: task short ids are only unique per org, and a
	// bare taskId (a real uuid) doesn't tell the CLI which org's `--org` to pass.
	input: z.object({ taskId: z.string(), orgSlug: z.string() }),
	output: TaskSchema.extend({
		aiSummary: AiSummarySchema,
		comments: z.array(CommentSchema).default([]),
		commentsTotal: z.number().default(0),
	}),
});

export const listCommentsRpc = defineRpc({
	name: "sayr.comment.list",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), page: z.number().optional() }),
	output: z.object({
		comments: z.array(CommentSchema),
		pagination: PaginationSchema,
	}),
});

export const listRepliesRpc = defineRpc({
	name: "sayr.comment.replies",
	input: z.object({ commentId: z.string(), page: z.number().optional() }),
	output: z.object({
		replies: z.array(CommentSchema),
		pagination: PaginationSchema,
	}),
});

// --- Writes ---

export const updateTaskStatusRpc = defineRpc({
	name: "sayr.task.set-status",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), status: z.enum(TASK_STATUSES) }),
	output: z.object({ ok: z.literal(true) }),
});

export const updateTaskPriorityRpc = defineRpc({
	name: "sayr.task.set-priority",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), priority: z.enum(TASK_PRIORITIES) }),
	output: z.object({ ok: z.literal(true) }),
});

export const setAssigneesRpc = defineRpc({
	name: "sayr.task.set-assignees",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), userIds: z.array(z.string()) }),
	output: z.object({ ok: z.literal(true) }),
});

export const createCommentRpc = defineRpc({
	name: "sayr.comment.create",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), content: z.string().min(1) }),
	output: z.object({ ok: z.literal(true) }),
});
