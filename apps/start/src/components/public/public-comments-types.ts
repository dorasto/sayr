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
}

export interface CommentsPage {
	data: CommentData[];
	pagination: {
		pageFromStart: number;
		pageFromEnd: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export interface PublicCommentItemProps {
	comment: CommentData;
	memberTeamName: string | null;
	onToggleReaction?: (commentId: string, emoji: ReactionEmoji) => void;
	users: schema.userType[];
	currentUserId?: string;
	onEdit: (commentId: string, content: NodeJSON) => Promise<boolean>;
	onDelete: (commentId: string) => Promise<boolean>;
	categories: schema.categoryType[];
}
