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

export interface TaskPerson {
	id: string;
	name: string | null;
	image: string | null;
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
	releaseId?: string;
	visible?: TaskVisibility;
}
