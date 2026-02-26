import type { account, session, user, verification } from "./auth";
import type { githubIssueType } from "./github_issue.schema";
import type { labelType } from "./label.schema";
import type { OrganizationMemberType, TeamPermissions } from "./member.schema";
import type { organizationType } from "./organization.schema";
import type { releaseType } from "./release.schema";
import type { taskType } from "./task.schema";
import type { taskCommentType } from "./taskComment.schema";
import type { taskTimelineType } from "./taskTimeline.schema";
import type { issueTemplateType } from "./taskTemplate.schema";
import type { labelType as LabelTypeImport } from "./label.schema";
import type { notificationType } from "./notification.schema";
import { githubPullRequestType } from "./github_pull_request.schema";

export * from "./category.schema";
export * from "./github_installation.schema";
export * from "./github_installation_org.schema";
export * from "./github_issue.schema";
export * from "./github_repository.schema";
export * from "./invite.schema";
export * from "./label.schema";
export * from "./member.schema";
export * from "./organization.schema";
export * from "./release.schema";
export * from "./saveView.schema";
export * from "./task.schema";
export * from "./taskAssignee.schema";
export * from "./taskComment.schema";
export * from "./taskTimeline.schema";
export * from "./taskCommentHistory.schema";
export * from "./taskCommentReaction.schema";
export * from "./taskTemplate.schema";
export * from "./taskVote.schema";
export * from "./apikey.schema";
export * from "./notification.schema";
export * from "./github_pull_request.schema";
export interface NodeJSON {
	type: string;
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	marks?: Array<{ type: string; attrs?: Record<string, any> }>;
	text?: string;
	content?: NodeJSON[];
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	attrs?: Record<string, any>;
}

/**
 * Lightweight user data for display purposes (avatars, names, etc.)
 * Used for actor/createdBy/assignee relations throughout the app.
 * IMPORTANT: Keep in sync with userSummaryColumns in functions/index.ts
 */
export type UserSummary = {
	id: string;
	name: string;
	image: string | null;
	displayName?: string | null;
};

export interface MemberTeamInfo {
	id: string;
	memberId: string;
	teamId: string;
	team: {
		id: string;
		name: string;
		permissions: TeamPermissions;
	};
}

export interface OrganizationWithMembers extends organizationType {
	members: (OrganizationMemberType & { user: userType; teams?: MemberTeamInfo[] })[];
}
export type TaskWithLabels = Omit<taskType, "createdBy"> & {
	labels: labelType[];
	assignees: UserSummary[];
	createdBy?: UserSummary | null;
	organization?: { id: string; name: string; slug: string; logo: string | null };
	comments?: CommentsWithAuthor;
	githubIssue?: githubIssueType;
	githubPullRequest?: githubPullRequestType;
	description: NodeJSON;
};

export type CommentsWithAuthor = Array<
	Omit<taskCommentType, "createdBy"> & {
		createdBy: UserSummary | null;
		content: NodeJSON;
		parentId?: string | null;
		replyCount?: number;
	}
>;

export type taskTimelineWithActor = taskTimelineType & {
	visibility: "public" | "internal";
	actor?: UserSummary;
	updatedAt?: Date | null;
	reactions?: {
		total: number;
		reactions: Record<
			string,
			{
				count: number;
				users: string[];
			}
		>;
	};
	source: "sayr" | "github";
	externalAuthorLogin: string | null;
	externalAuthorUrl: string | null;
	externalCommentId: string | null;
	externalCommentUrl: string | null;
	externalIssueNumber: number | null;
	// Threading fields
	parentId?: string | null;
	replyCount?: number;
	latestReplyAuthor?: UserSummary | null;
	replyAuthors?: UserSummary[];
};

export type issueTemplateWithRelations = issueTemplateType & {
	labels: LabelTypeImport[];
	assignees: UserSummary[];
	category?: { id: string; name: string; color: string | null; icon: string | null } | null;
};

export type ReleaseWithTasks = Omit<releaseType, "createdBy"> & {
	tasks: TaskWithLabels[];
	createdBy?: UserSummary | null;
};

export type NotificationWithDetails = notificationType & {
	actor?: UserSummary | null;
	task: {
		id: string;
		shortId: number | null;
		title: string;
		status: string;
		priority: string;
	};
	organization: {
		id: string;
		name: string;
		slug: string;
		logo: string | null;
	};
	timelineEvent?: {
		id: string;
		eventType: string;
		fromValue: unknown;
		toValue: unknown;
	} | null;
};

/* -------------------------------------------------------------------------- */
/*                               Auth Types                                   */
/* -------------------------------------------------------------------------- */

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
