import { authClient } from "@repo/auth/client";
import type { OrganizationSettings, PublicTaskFieldSettings } from "@repo/database";
import { useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";

/** Client-safe defaults (avoids importing from @repo/database which pulls in node:crypto). */
const defaultPublicTaskFieldSettings: PublicTaskFieldSettings = {
	labels: true,
	category: true,
	priority: true,
};

const defaultOrganizationSettings: OrganizationSettings = {
	allowActionsOnClosedTasks: true,
	publicActions: true,
	enablePublicPage: true,
	publicTaskAllowBlank: true,
	publicTaskFields: defaultPublicTaskFieldSettings,
};

/**
 * What the viewer may do about posting, per the org's public settings (`publicActions`, templates, field gating). The
 * only way to post is the full form (`NewPostPage`); the board's "Share an idea" card and the rest of the portal use this
 * to decide whether to offer it.
 */
export function usePublicPostAbility() {
	const { data: session } = authClient.useSession();
	const { organization, issueTemplates } = usePublicOrganizationLayout();
	const isOrgMember = useIsOrgMember(organization);

	const settings = useMemo<OrganizationSettings>(() => {
		const raw = organization.settings as Partial<OrganizationSettings> | null;
		return {
			...defaultOrganizationSettings,
			...raw,
			publicTaskFields: {
				...defaultPublicTaskFieldSettings,
				...(raw?.publicTaskFields ?? {}),
			},
		};
	}, [organization.settings]);

	return {
		settings,
		loggedIn: !!session?.user,
		// Org members can always post; everyone else only when the org allows public actions. Logged-out visitors still
		// see the offer (so they can log in to use it) whenever it would be allowed for them.
		canPost: isOrgMember || settings.publicActions,
		// The org disallows blank posts and has templates: the form makes picking one mandatory.
		needsFullForm: issueTemplates.length > 0 && !settings.publicTaskAllowBlank,
	};
}
