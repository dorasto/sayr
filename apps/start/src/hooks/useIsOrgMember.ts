import type { schema } from "@repo/database";
import { authClient } from "@repo/auth/client";
import { useMemo } from "react";

/**
 * Returns whether the currently authenticated user is a member of the given organization.
 *
 * Uses the `members` array already present on `OrganizationWithMembers` — no extra
 * fetch is required. Safe to call from both public and admin contexts as long as the
 * organization object includes its members.
 *
 * @param organization - An organization object that includes a `members` array with
 *   nested `user` objects (i.e. `OrganizationWithMembers`).
 */
export function useIsOrgMember(
	organization: Pick<schema.OrganizationWithMembers, "members">,
): boolean {
	const { data: session } = authClient.useSession();

	return useMemo(
		() => !!session?.user?.id && organization.members.some((m) => m.user.id === session.user.id),
		[session?.user?.id, organization.members],
	);
}
