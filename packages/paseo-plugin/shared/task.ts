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

const CategorySchema = z
	.looseObject({
		id: z.string(),
		name: z.string(),
	})
	.nullable()
	.optional();

/**
 * Mirrors `packages/cli/src/types.ts`'s `Task`, loosely — the CLI's `--json`
 * output carries more fields than any one screen needs (relations, subtasks,
 * githubIssue, ...), and `z.looseObject` keeps unknown ones passing through
 * instead of failing validation, matching the backend's own
 * `apps/backend/routes/api/public/v1/me/schemas.ts` convention for the same
 * reason: precision here is a nicety, not the actual contract boundary.
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

export const listTasksRpc = defineRpc({
	name: "sayr.task.list",
	input: z.object({}),
	output: z.object({ tasks: z.array(TaskSchema) }),
});

// Flat, not `{ task, comments }` nested — matches `sayr task view --json`'s
// own shape (`{ ...task, comments, commentsTotal }`) exactly, so the server
// handler is a pure passthrough rather than a reshaping step.
export const getTaskRpc = defineRpc({
	name: "sayr.task.get",
	input: z.object({ taskId: z.string() }),
	output: TaskSchema.extend({
		aiSummary: AiSummarySchema,
		comments: z.array(CommentSchema).default([]),
		commentsTotal: z.number().default(0),
	}),
});

export const listCommentsRpc = defineRpc({
	name: "sayr.comment.list",
	input: z.object({ taskId: z.string(), page: z.number().optional() }),
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
