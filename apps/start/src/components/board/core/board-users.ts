import type { schema } from "@repo/database";

/**
 * Users the board derives from the items it already has — there is no org-membership
 * list loaded alongside them. Pure so both derivations (and the provider-supplied
 * override in board-data.tsx) can be reasoned about and tested without React.
 */

/** Who a task in `organizationId` can be assigned to: every assignee seen on that org's items. */
export function deriveAssignableUsers(
	items: readonly { organizationId: string; assignees: readonly schema.UserSummary[] }[],
	organizationId: string
): schema.UserSummary[] {
	const users = new Map<string, schema.UserSummary>();
	for (const item of items) {
		if (item.organizationId !== organizationId) continue;
		for (const user of item.assignees) users.set(user.id, user);
	}
	return Array.from(users.values());
}

/** Every person seen across the items, as an assignee or a creator — the filter pickers' user list. */
export function deriveFilterUsers(
	items: readonly { assignees: readonly schema.UserSummary[]; createdBy?: schema.UserSummary | null }[]
): schema.UserSummary[] {
	const users = new Map<string, schema.UserSummary>();
	for (const item of items) {
		for (const user of item.assignees) users.set(user.id, user);
		if (item.createdBy) users.set(item.createdBy.id, item.createdBy);
	}
	return Array.from(users.values());
}
