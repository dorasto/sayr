import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

// Every RPC wire name must match /^[a-z][a-z0-9._-]*$/ (dotted, lowercase) —
// camelCase load-fails the whole plugin.

export const TASK_STATUSES = ["backlog", "todo", "in-progress", "done", "canceled"] as const;
export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

/**
 * Mirrors `apps/start/src/components/tasks/shared/config.tsx`'s `statusConfig`/
 * `priorityConfig` exactly (labels and hex colors) — not a re-derived
 * approximation — so this plugin reads as the same product, not a reskin.
 * Not imported directly: that file pulls in `@repo/ui` icon components and
 * Tailwind classNames, neither meaningful in a React Native client bundle.
 */
export const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
	backlog: "Backlog",
	todo: "Todo",
	"in-progress": "In Progress",
	done: "Done",
	canceled: "Canceled",
};

export const STATUS_COLORS: Record<(typeof TASK_STATUSES)[number], string> = {
	backlog: "#6B7280",
	todo: "#3B82F6",
	"in-progress": "#F59E0B",
	done: "#10B981",
	canceled: "#EF4444",
};

/**
 * Lucide icon names (Paseo's `Icon` component only ships Lucide, not the
 * Tabler set `packages/ui/src/components/icons/status.tsx` actually uses) —
 * `done`/`canceled` are genuine equivalents of that file's own
 * `IconCircleCheck`/`IconCircleX` fallback case; `backlog`/`todo`/
 * `in-progress` are the closest available analogues, since that file's
 * default case is a bespoke circle-progress SVG with no Lucide counterpart.
 */
export const STATUS_ICONS: Record<(typeof TASK_STATUSES)[number], string> = {
	backlog: "CircleDashed",
	todo: "Circle",
	"in-progress": "CircleDotDashed",
	done: "CircleCheck",
	canceled: "CircleX",
};

/**
 * Backlog/todo/in-progress only — the statuses the board actually shows a
 * column for. Done/canceled aren't even fetched (see `server/task-handlers.ts`,
 * no `--include-closed`); the status picker in the task detail sheet still
 * covers the full `TASK_STATUSES` enum, so a task moved to done/canceled
 * there just drops off the board until reopened.
 */
export const BOARD_STATUSES = [
	"backlog",
	"todo",
	"in-progress",
] as const satisfies readonly (typeof TASK_STATUSES)[number][];

export const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
	none: "No Priority",
	low: "Low",
	medium: "Medium",
	high: "High",
	urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<(typeof TASK_PRIORITIES)[number], string> = {
	none: "#9CA3AF",
	low: "#6B7280",
	medium: "#F59E0B",
	high: "#EF4444",
	urgent: "#DC2626",
};

/**
 * `packages/ui/src/components/icons/priority.tsx` is a bespoke signal-bar SVG
 * (1/2/3 bars) plus a filled alert square for urgent — Lucide's own
 * signal-strength icons are the closest match for the bars, and `TriangleAlert`
 * for urgent since Lucide has no filled alert-square icon.
 */
export const PRIORITY_ICONS: Record<(typeof TASK_PRIORITIES)[number], string> = {
	none: "SignalZero",
	low: "SignalLow",
	medium: "SignalMedium",
	high: "SignalHigh",
	urgent: "TriangleAlert",
};

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
 * Resolving the id to an actual name needs a separate lookup — see
 * `CategoryInfoSchema`/`listCategoriesRpc`/`resolveCategoryName` below.
 */
const CategorySchema = z
	.union([z.string(), z.looseObject({ id: z.string(), name: z.string() })])
	.nullable()
	.optional();

export const CategoryInfoSchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	/** hsla(...) string, as stored — usable directly as a React Native color. */
	color: z.string().optional(),
});
export type CategoryInfo = z.output<typeof CategoryInfoSchema>;

/**
 * Same gap/fix shape as category: a task's `releaseId` is a raw id
 * (`packages/database/schema/release.schema.ts`'s column), never expanded —
 * resolving it to a name needs `listReleasesRpc` below, same as category
 * needs `listCategoriesRpc`. `icon` is a Tabler icon name (e.g. "IconRocket",
 * the website's own free-text convention for releases) — not usable as a
 * Lucide name, so the plugin doesn't render it, just `color` + `name`.
 */
export const ReleaseInfoSchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	status: z.enum(["planned", "in-progress", "released", "archived"]),
	color: z.string().nullable().optional(),
});
export type ReleaseInfo = z.output<typeof ReleaseInfoSchema>;

/** Resolves a task's `releaseId` to a display name, given the org's release list (from `listReleasesRpc`). */
export function resolveReleaseName(
	releaseId: string | null | undefined,
	releases: ReleaseInfo[] | undefined
): string | undefined {
	if (!releaseId) return undefined;
	return releases?.find((r) => r.id === releaseId)?.name;
}

/**
 * Same gap/fix shape as category/release: there was previously no `/me/*`
 * way to list an organization's labels at all (only ever the full set
 * already attached to one task, via the `labels` relation below) — needed
 * so a client can build a labels picker instead of only ever showing
 * whatever a task already happens to have. Includes both public and
 * private labels — this is a member-authenticated route, same as `/me/tasks`
 * including both visibilities rather than degrading to public-only.
 */
export const LabelInfoSchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	color: z.string().nullable().optional(),
	visible: z.enum(["public", "private"]),
});
export type LabelInfo = z.output<typeof LabelInfoSchema>;

/** Resolves a task's `category` field to a display name, given the org's category list (from `listCategoriesRpc`). Returns `undefined` if `category` is null/absent or the id isn't found (e.g. categories haven't loaded yet). */
export function resolveCategoryName(
	category: Task["category"],
	categories: CategoryInfo[] | undefined
): string | undefined {
	if (!category) return undefined;
	if (typeof category === "object") return category.name;
	return categories?.find((c) => c.id === category)?.name;
}

const OrgMemberSchema = z.looseObject({
	userId: z.string(),
	user: z.looseObject({
		id: z.string(),
		name: z.string().nullable().optional(),
		image: z.string().nullable().optional(),
	}),
});

/** Mirrors `packages/cli/src/types.ts`'s `Organization` — plus `logo`, which the CLI's own type omits but the real API returns (see `packages/database/schema/organization.schema.ts`'s `logo` column). */
export const OrgSchema = z.looseObject({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	/** Task-key prefix, e.g. "SAY" in "SAY-123" — see `formatTaskKey` below. */
	shortId: z.string(),
	logo: z.string().nullable().optional(),
	members: z.array(OrgMemberSchema).default([]),
});
export type Org = z.output<typeof OrgSchema>;

/** Local copy of `packages/util/src/index.ts`'s `formatTaskKey` — see the note on `extractPlainText` in `shared/prosekit.ts` for why this isn't an import. */
export function formatTaskKey(orgShortId: string, taskShortId: number | null | undefined): string {
	return `${orgShortId}-${taskShortId ?? "?"}`;
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
	releaseId: z.string().nullable().optional(),
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

export const listCategoriesRpc = defineRpc({
	name: "sayr.category.list",
	input: z.object({ orgSlug: z.string() }),
	output: z.object({ categories: z.array(CategoryInfoSchema) }),
});

export const listReleasesRpc = defineRpc({
	name: "sayr.release.list",
	input: z.object({ orgSlug: z.string() }),
	output: z.object({ releases: z.array(ReleaseInfoSchema) }),
});

export const listLabelsRpc = defineRpc({
	name: "sayr.label.list",
	input: z.object({ orgSlug: z.string() }),
	output: z.object({ labels: z.array(LabelInfoSchema) }),
});

/**
 * Gated server-side by the `content.manageLabels` scope
 * (`apps/backend/routes/api/public/v1/me/labels.ts`) — a caller without it
 * gets a plain 403, surfaced as a toast in the client picker rather than
 * anything pre-checked here. Idempotent by `(orgSlug, name)`: creating a
 * label whose name already exists just returns the existing one.
 */
export const createLabelRpc = defineRpc({
	name: "sayr.label.create",
	input: z.object({
		orgSlug: z.string(),
		name: z.string().min(1),
		color: z.string().optional(),
		visible: z.enum(["public", "private"]).optional(),
	}),
	output: LabelInfoSchema,
});

/** The CLI's logged-in user — powers the "assigned to me" filter (`sayr whoami --json`). */
export const MeSchema = z.looseObject({
	id: z.string(),
	name: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
});
export type Me = z.output<typeof MeSchema>;

export const getMeRpc = defineRpc({
	name: "sayr.me.get",
	input: z.object({}),
	output: MeSchema,
});

/**
 * The CLI's resolved connection config (`sayr config get --json`) — `baseUrl`
 * powers "Open on Sayr" (`shared/web-url.ts`'s `deriveTaskWebUrl`). Never
 * carries the token itself, not even truncated — see `config.ts`'s own
 * `--json` handler.
 */
export const CliConfigSchema = z.looseObject({
	baseUrl: z.string(),
	defaultOrg: z.string().nullable().optional(),
	hasToken: z.boolean(),
});
export type CliConfig = z.output<typeof CliConfigSchema>;

export const getCliConfigRpc = defineRpc({
	name: "sayr.config.get",
	input: z.object({}),
	output: CliConfigSchema,
});

export const listTasksRpc = defineRpc({
	name: "sayr.task.list",
	input: z.object({}),
	output: z.object({ tasks: z.array(TaskSchema), orgs: z.array(OrgSchema) }),
});

// Flat, not `{ task, comments }` nested — matches `sayr task view --json`'s
// own shape (`{ ...task, comments, commentsTotal }`) exactly, so the server
// handler is mostly a passthrough rather than a reshaping step.
const TaskDetailSchema = TaskSchema.extend({
	aiSummary: AiSummarySchema,
	comments: z.array(CommentSchema).default([]),
	commentsTotal: z.number().default(0),
});
/** What a client actually receives back from `getTaskRpc` (post-parse, defaults applied) — use this client-side, not `RpcOutput<typeof getTaskRpc>` (that's the *input* side of the schema, i.e. what the server handler must return pre-validation). */
export type TaskDetail = z.output<typeof TaskDetailSchema>;

export const getTaskRpc = defineRpc({
	name: "sayr.task.get",
	// `orgSlug` disambiguates: task short ids are only unique per org, and a
	// bare taskId (a real uuid) doesn't tell the CLI which org's `--org` to pass.
	input: z.object({ taskId: z.string(), orgSlug: z.string() }),
	output: TaskDetailSchema,
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

export const setLabelsRpc = defineRpc({
	name: "sayr.task.set-labels",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), labelIds: z.array(z.string()) }),
	output: z.object({ ok: z.literal(true) }),
});

export const createCommentRpc = defineRpc({
	name: "sayr.comment.create",
	input: z.object({ taskId: z.string(), orgSlug: z.string(), content: z.string().min(1) }),
	output: z.object({ ok: z.literal(true) }),
});
