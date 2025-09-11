import type { account, session, user, verification } from "./auth";
import type { memberType } from "./member.schema";
import type { organizationType } from "./organization.schema";

export * from "./member.schema";
export * from "./organization.schema";
export * from "./task.schema";
export * from "./taskComment.schema";

export interface OrganizationWithMembers extends organizationType {
	members: (memberType & { user: userType })[];
}
/* -------------------------------------------------------------------------- */
/*                               Auth Types                                   */
/* -------------------------------------------------------------------------- */

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
