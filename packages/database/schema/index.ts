import type { account, session, user, verification } from "./auth";
import type { labelType } from "./label.schema";
import type { memberType } from "./member.schema";
import type { organizationType } from "./organization.schema";
import type { projectType } from "./project.schema";
import type { taskType } from "./task.schema";
import type { taskCommentType } from "./taskComment.schema";
import type { taskTimelineType } from "./taskTimeline.schema";

export * from "./label.schema";
export * from "./member.schema";
export * from "./organization.schema";
export * from "./project.schema";
export * from "./task.schema";
export * from "./taskAssignee.schema";
export * from "./taskComment.schema";
export * from "./taskTimeline.schema";

export interface OrganizationWithMembers extends organizationType {
	members: (memberType & { user: userType })[];
	projects: projectType[];
}
export type TaskWithLabels = taskType & {
	comments: taskCommentType[];
	labels: labelType[];
	assignees: userType[];
	createdBy?: userType;
	timeline: taskTimelineWithActor[];
};

export type taskTimelineWithActor = taskTimelineType & {
	actor?: userType;
};

/* -------------------------------------------------------------------------- */
/*                               Auth Types                                   */
/* -------------------------------------------------------------------------- */

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
