/* =======================
 * Shared
 * ======================= */

export interface ApiSuccess<T> {
    success: true;
    data: T;
}

export interface ApiError {
    success: false;
    error: string;
    message?: string;
    status?: number;
}

export interface Pagination {
    limit: number;
    page: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
}

/* =======================
 * Organization
 * ======================= */

export interface OrganizationUser {
    id: string;
    name: string;
    image: string | null;
    createdAt: string;
}

export interface OrganizationMember {
    id: string;
    userId: string;
    organizationId: string;
    createdAt: string;
    user: OrganizationUser;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    bannerImg: string | null;
    description: string;
    createdAt: string;
    updatedAt: string;
    members: OrganizationMember[];
    eventsUrl: string;
}

/* =======================
 * Labels
 * ======================= */

export interface Label {
    id: string;
    organizationId: string;
    name: string;
    color: string | null;
    createdAt: string;
}

/* =======================
 * Categories
 * ======================= */

export interface Category {
    id: string;
    organizationId: string;
    name: string;
    color: string | null;
    icon: string | null;
    createdAt: string;
}

/* =======================
 * Tasks
 * ======================= */

export type TaskStatus =
    | "backlog"
    | "todo"
    | "in-progress"
    | "done"
    | "canceled";

export type TaskPriority =
    | "none"
    | "low"
    | "medium"
    | "high"
    | "urgent";

export interface Task {
    id: string;
    organizationId: string;
    shortId: number | null;
    visible: "public" | "private";
    createdAt: string;
    updatedAt: string;
    title: string | null;
    description: unknown | null;
    status: TaskStatus;
    priority: TaskPriority;
    createdBy: string | null;
    category: string | null;
    voteCount: number;
    descriptionHtml: string;
    descriptionMarkdown: string;
}

/* =======================
 * Comments
 * ======================= */

export interface CommentUser {
    name: string | null;
    image: string | null;
}

export interface CommentReaction {
    count: number;
    users: string[];
}

export interface Comment {
    id: string;
    organizationId: string;
    taskId: string | null;
    createdAt: string;
    updatedAt: string;
    content: unknown | null;
    visibility: "public" | "internal";
    contentHtml: string;
    contentMarkdown: string;
    createdBy: CommentUser | null;
    reactions?: {
        total: number;
        reactions: Record<string, CommentReaction>;
    };
}