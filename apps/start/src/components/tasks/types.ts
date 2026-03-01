import type { schema } from "@repo/database";

/**
 * Minimal organization shape available on cross-org task objects (e.g. `task.organization`).
 * Contains only the fields needed for display (avatar, link, clipboard slug).
 */
export type MinimalOrganization = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
};

/**
 * Union accepted by task detail components that work in both single-org and cross-org contexts.
 *
 * - **Single-org** consumers pass the full `OrganizationWithMembers` (includes `.members`).
 * - **Cross-org** consumers pass a `MinimalOrganization` (from `task.organization`).
 *
 * Use the `"members" in organization` type guard when you need to access members.
 */
export type TaskDetailOrganization =
	| schema.OrganizationWithMembers
	| MinimalOrganization;

/**
 * Type guard: returns `true` when the organization carries a `.members` array,
 * narrowing to `schema.OrganizationWithMembers`.
 */
export function hasMembers(
	org: TaskDetailOrganization,
): org is schema.OrganizationWithMembers {
	return "members" in org;
}

/**
 * Derive `availableUsers` from an organization when members are present.
 * Falls back to the task's existing assignees (cast to `userType[]`) when only
 * a `MinimalOrganization` is available, or to an empty array.
 */
export function deriveAvailableUsers(
	organization?: TaskDetailOrganization,
	task?: { assignees?: schema.TaskWithLabels["assignees"] },
): schema.userType[] {
	if (organization && hasMembers(organization)) {
		return organization.members.map((m) => m.user);
	}
	if (task?.assignees) {
		return task.assignees as unknown as schema.userType[];
	}
	return [];
}
