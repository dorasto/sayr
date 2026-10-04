import { authClient } from "@repo/auth/client";
import type { OrganizationSettings } from "@repo/database";
import { useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";

/**
 * Whether the viewer can perform write actions on a post (comment, react, reply, edit, delete). Org members always
 * can. Everyone else needs a session, `publicActions` enabled, and — on closed posts — `allowActionsOnClosedTasks`.
 * Voting is not covered here: it is never login-gated.
 */
export function useCanAct(taskStatus: string) {
	const { data: session } = authClient.useSession();
	const { organization } = usePublicOrganizationLayout();
	const isOrgMember = useIsOrgMember(organization);

	const canAct = useMemo(() => {
		if (!session?.user) return false;
		if (isOrgMember) return true;
		const settings = organization.settings as OrganizationSettings | null;
		if (settings?.publicActions === false) return false;
		const isClosed = taskStatus === "done" || taskStatus === "canceled";
		if (isClosed && settings?.allowActionsOnClosedTasks === false) return false;
		return true;
	}, [session?.user, isOrgMember, organization.settings, taskStatus]);

	return { session, isLoggedIn: !!session?.user, isOrgMember, canAct };
}
