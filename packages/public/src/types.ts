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

export interface OrganizationMember {
    id: string;
    name: string;
    image: string | null;
}

export interface Organization {
    id: string;
    slug: string;
    name: string;
    logo: string | null;
    bannerImg: string | null;
    eventsUrl: string;
    members: OrganizationMember[];
}

/* =======================
 * Labels
 * ======================= */

export interface Label {
    id: string;
    organizationId: string;
    name: string;
    color: string | null;
    visible: "public" | "private";
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
    createdBy: {
        id: string;
        name: string | null;
        displayName: string | null;
        image: string | null;
    } | null;
    category: Category | null;
    labels: Label[];
    releaseId: string | null;
    voteCount: number;
    parentId: string | null;
    descriptionHtml: string;
    descriptionMarkdown: string;
}

/* =======================
 * Comments
 * ======================= */

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
    contentHtml: string;
    contentMarkdown: string;
    createdBy: {
        name: string | null;
        image: string | null;
    } | null;
    visibility: "public" | "internal";
    source: "sayr" | "github";
    parentId: string | null;
    reactions?: {
        total: number;
        reactions: Record<string, CommentReaction>;
    };
}

export interface Release {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: unknown | null;
    status: "planned" | "in-progress" | "released" | "archived";
    targetDate: string;
    releasedAt: string | null;
    color: string | null;
    icon: string | null;
    createdBy: {
        id: string;
        name: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}