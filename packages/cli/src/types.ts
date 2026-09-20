/**
 * Wire types for the `/api/public/v1/me/*` surface. Kept CLI-local rather than
 * imported from `@sayrio/public` because that SDK doesn't yet cover the
 * list/view/update/labels/assignees/comment-edit endpoints this CLI needs —
 * see the "known gaps" note in the CLI README.
 */

export interface ApiSuccessEnvelope<T> {
	success: true;
	data: T;
	message?: string;
	pagination?: ApiPagination;
}

export interface ApiErrorEnvelope {
	success: false;
	error: string;
	message?: string;
}

export interface ApiPagination {
	limit: number;
	page: number;
	totalPages: number;
	totalItems: number;
	hasMore: boolean;
}

export type TaskStatus = "backlog" | "todo" | "in-progress" | "done" | "canceled";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskVisibility = "public" | "private";
export type CommentVisibility = "public" | "internal";

export interface Me {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
	createdAt: string;
}

export interface OrganizationMember {
	id: string;
	userId: string;
	organizationId: string;
	createdAt: string;
	user: { id: string; name: string | null; image: string | null; createdAt: string };
}

export interface Organization {
	id: string;
	slug: string;
	name: string;
	/** Short prefix used in task keys, e.g. "SAY" in "SAY-123". */
	shortId: string;
	members: OrganizationMember[];
	eventsUrl: string;
}

export interface Label {
	id: string;
	organizationId: string;
	name: string;
	color: string | null;
	visible: TaskVisibility;
	createdAt: string;
}

export interface Category {
	id: string;
	organizationId: string;
	name: string;
	color: string | null;
	icon: string | null;
	createdAt: string;
}

export type ReleaseStatus = "planned" | "in-progress" | "released" | "archived";
export type ReleaseHealth = "on_track" | "at_risk" | "off_track";

/** The raw release row, as returned by `releases list` and the write endpoints. */
export interface Release {
	id: string;
	organizationId: string;
	name: string;
	slug: string;
	/** Prosekit/ProseMirror document JSON — see `lib/prosekit.ts` for plain-text rendering. */
	description: unknown | null;
	status: ReleaseStatus;
	targetDate: string | null;
	releasedAt: string | null;
	/** An `hsla(h, s%, l%, 1)` string. */
	color: string | null;
	/** A Tabler icon name, e.g. "IconRocket". */
	icon: string | null;
	leadId: string | null;
	/** User id of the creator (`ReleaseDetail` swaps this for the full person). */
	createdBy: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface TaskPerson {
	id: string;
	name: string | null;
	image: string | null;
}

/** A task attached to a release — the slim shape `GET /releases/:release` returns (no embedding/description). */
export interface ReleaseTask {
	id: string;
	shortId: number | null;
	title: string | null;
	status: TaskStatus;
	priority: TaskPriority;
}

/** A GitHub pull request linked to a release. */
export interface ReleasePullRequest {
	id: string;
	prNumber: number;
	prUrl: string;
	title: string;
	/** "open" | "closed" */
	state: string;
	merged: boolean;
	headBranch: string;
	baseBranch: string;
}

/** Task totals for a release; `open` = everything not done or canceled (what `publish` would close). */
export interface ReleaseTaskCounts {
	total: number;
	open: number;
	done: number;
	canceled: number;
}

export interface ReleaseDetail extends Omit<Release, "createdBy"> {
	/** The description rendered as Markdown by the server. */
	descriptionMarkdown: string | null;
	createdBy: TaskPerson | null;
	lead: TaskPerson | null;
	labels: Label[];
	githubPullRequests: ReleasePullRequest[];
	tasks: ReleaseTask[];
	taskCounts: ReleaseTaskCounts;
}

export interface ReleaseStatusUpdate {
	id: string;
	releaseId: string;
	organizationId: string;
	/** Prosekit/ProseMirror document JSON — see `lib/prosekit.ts` for plain-text rendering. */
	content: unknown | null;
	contentMarkdown?: string | null;
	health: ReleaseHealth;
	visibility: CommentVisibility;
	createdAt: string;
	updatedAt: string;
	author: TaskPerson | null;
	commentCount: number;
}

export interface ReleaseComment {
	id: string;
	releaseId: string;
	organizationId: string;
	/** Set when the comment is on a specific status update rather than on the release itself. */
	statusUpdateId: string | null;
	/** Prosekit/ProseMirror document JSON — see `lib/prosekit.ts` for plain-text rendering. */
	content: unknown | null;
	contentMarkdown?: string | null;
	visibility: CommentVisibility;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
	createdBy: TaskPerson | null;
	/** Only present on top-level comments. */
	replyCount?: number;
}

export interface PublishReleaseResult {
	release: Release;
	/** Open tasks that were closed as done by this call. */
	updatedTaskCount: number;
	/** True when the release was already released — nothing was written. */
	alreadyReleased: boolean;
}

/**
 * A cached AI-generated task summary, if one exists. Read-only best-effort —
 * `null`/absent whenever AI isn't enabled/allowed for the org, or none has
 * ever been generated (e.g. via the web UI). The CLI never triggers
 * generation itself.
 */
export interface TaskAiSummary {
	hasCachedSummary: boolean;
	isStale: boolean;
	summary: string | null;
	generatedAt: string | null;
}

export interface Task {
	id: string;
	organizationId: string;
	shortId: number | null;
	visible: TaskVisibility;
	createdAt: string;
	updatedAt: string;
	title: string | null;
	/** Prosekit/ProseMirror document JSON — see `lib/prosekit.ts` for plain-text rendering. */
	description: unknown | null;
	status: TaskStatus;
	priority: TaskPriority;
	createdBy: TaskPerson | null;
	category: Category | null;
	labels: Label[];
	assignees?: TaskPerson[];
	releaseId: string | null;
	voteCount: number;
	parentId: string | null;
	aiSummary?: TaskAiSummary | null;
}

export interface Comment {
	id: string;
	taskId: string | null;
	organizationId: string;
	/** Prosekit/ProseMirror document JSON — see `lib/prosekit.ts` for plain-text rendering. */
	content: unknown | null;
	contentHtml?: string | null;
	contentMarkdown?: string | null;
	visibility: CommentVisibility;
	source: "sayr" | "github";
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
	createdBy: TaskPerson | null;
	replyCount: number;
	latestReplyAuthor: TaskPerson | null;
	replyAuthors: TaskPerson[];
}

export interface TaskCreated {
	id: string;
	shortId: string;
	title: string;
	orgSlug: string;
	publicPortalUrl: string;
}

export interface CreateTaskInput {
	title: string;
	orgId: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	category?: string;
	/** Release slug or id. */
	releaseId?: string;
}

/** A Prosekit/ProseMirror document — see `lib/prosekit.ts`. */
export interface ProsekitDoc {
	type: "doc";
	content: Array<{ type: "paragraph"; content?: Array<{ type: "text"; text: string }> }>;
}

export interface UpdateTaskInput {
	orgId: string;
	title?: string;
	description?: ProsekitDoc;
	status?: TaskStatus;
	priority?: TaskPriority;
	category?: string;
	/** Release slug or id; `null` removes the task from its release. */
	releaseId?: string | null;
	visible?: TaskVisibility;
}

/** Description, status-update and comment content on the release endpoints is Markdown (converted server-side). */
export interface CreateReleaseInput {
	orgId: string;
	name: string;
	slug?: string;
	description?: string;
	status?: ReleaseStatus;
	targetDate?: string;
	color?: string;
	icon?: string;
}

/** `null` clears `targetDate`, `releasedAt` and `leadId`. */
export interface UpdateReleaseInput {
	orgId: string;
	name?: string;
	slug?: string;
	description?: string;
	status?: ReleaseStatus;
	targetDate?: string | null;
	releasedAt?: string | null;
	color?: string;
	icon?: string;
	leadId?: string | null;
}

/** Body for both creating and editing a status update — every field is optional. */
export interface ReleaseStatusUpdateInput {
	orgId: string;
	content?: string;
	health?: ReleaseHealth;
	visibility?: CommentVisibility;
}

export interface CreateReleaseCommentInput {
	orgId: string;
	content: string;
	visibility?: CommentVisibility;
	/** Top-level comment being replied to. */
	parentId?: string;
	/** Status update the comment is attached to. */
	statusUpdateId?: string;
}

export interface UpdateReleaseCommentInput {
	content?: string;
	visibility?: CommentVisibility;
}
