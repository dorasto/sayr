import type { account, session, user, verification } from "./auth";
import type { githubIssueType } from "./github_issue.schema";
import type { labelType } from "./label.schema";
import type { memberType } from "./member.schema";
import type { organizationType } from "./organization.schema";
import type { taskType } from "./task.schema";
import type { taskCommentType } from "./taskComment.schema";
import type { taskTimelineType } from "./taskTimeline.schema";

export * from "./category.schema";
export * from "./github_installation.schema";
export * from "./github_issue.schema";
export * from "./github_repository.schema";
export * from "./invite.schema";
export * from "./label.schema";
export * from "./member.schema";
export * from "./organization.schema";
export * from "./saveView.schema";
export * from "./task.schema";
export * from "./taskAssignee.schema";
export * from "./taskComment.schema";
export * from "./taskTimeline.schema";

export interface OrganizationWithMembers extends organizationType {
	members: (memberType & { user: userType })[];
}
export type TaskWithLabels = taskType & {
	labels: labelType[];
	assignees: { id: string; name: string; image: string | null }[];
	createdBy?: { id: string; name: string; image: string | null } | null;
	organization?: { id: string; name: string; slug: string };
	comments?: CommentsWithAuthor;
	githubIssue?: githubIssueType;
	description: Array<string>;
};

export type CommentsWithAuthor = Array<
	taskCommentType & {
		createdBy: { id: string; name: string; image: string | null } | null;
		blockNote: Array<string>;
	}
>;

export type taskTimelineWithActor = taskTimelineType & {
	actor?: { id: string; name: string; image: string | null };
	visibility: "public" | "internal";
};

/* -------------------------------------------------------------------------- */
/*                               Auth Types                                   */
/* -------------------------------------------------------------------------- */

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
