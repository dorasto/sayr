import type { schema } from "@repo/database";
import type { NodeJSON } from "prosekit/core";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";

export interface CommentData {
	id: string;
	taskId: string;
	organizationId: string;
	content: NodeJSON;
	visibility: "public" | "internal";
	createdAt: string;
	updatedAt?: string;
	createdBy: { id: string; name: string; image: string | null; displayName?: string | null } | null;
	reactions?: {
		total: number;
		reactions: Record<string, { count: number; users: string[] }>;
	};
	parentId?: string | null;
	replyCount?: number;
	latestReplyAuthor?: { id: string; name: string; image: string | null; displayName?: string | null } | null;
	replyAuthors?: { id: string; name: string; image: string | null; displayName?: string | null }[];
	/** Where the comment was written. GitHub-synced comments have no `createdBy`. */
	source?: "sayr" | "github" | null;
	/** GitHub login of the author, set on GitHub-synced comments. */
	externalAuthorLogin?: string | null;
	/** GitHub profile URL of the author, set on GitHub-synced comments. */
	externalAuthorUrl?: string | null;
}

export interface CommentsPage {
	data: CommentData[];
	pagination: {
		pageFromStart: number;
		pageFromEnd: number;
		totalPages: number;
		hasMore: boolean;
		/** Total top-level comments on the task (all pages). */
		totalItems?: number;
	};
}

export interface PublicCommentItemProps {
	comment: CommentData;
	/** Highest team the author belongs to. Any non-null value marks the author as a team member (Team pill + ring). */
	memberTeamName: string | null;
	/** The comment's author wrote the post itself (shows the Author pill). Never set on GitHub-origin comments. */
	isAuthor?: boolean;
	onToggleReaction?: (commentId: string, emoji: ReactionEmoji) => void;
	users: schema.userType[];
	currentUserId?: string;
	onEdit?: (commentId: string, content: NodeJSON) => Promise<boolean>;
	onDelete?: (commentId: string) => Promise<boolean>;
	categories: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	/** Footer slot for rendering thread trigger + body inside the card */
	footer?: React.ReactNode;
	/** Whether this comment is a reply (adjusts styling) */
	isReply?: boolean;
	/** Callback when "Reply" action is clicked */
	onReply?: () => void;
	/** Set of blocked user IDs for this organization */
	blockedUserIds?: Set<string>;
	/** Whether the current viewer is an org member */
	isOrgMember?: boolean;
}
