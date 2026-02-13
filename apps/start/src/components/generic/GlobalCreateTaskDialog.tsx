"use client";

import type { schema } from "@repo/database";
import { useMatch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import CreateIssueDialog from "@/components/tasks/task/creator/index";
import { commandActions, commandStore } from "@/lib/command-store";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";

interface OrgData {
	organization: schema.OrganizationWithMembers;
	labels: schema.labelType[];
	categories: schema.categoryType[];
	issueTemplates: schema.issueTemplateWithRelations[];
	releases: schema.releaseType[];
}

/**
 * A global, org-agnostic task creation dialog that can be triggered from anywhere.
 * Reads open state from commandStore.createTaskDialog.
 * Uses the full CreateIssueDialog with org picker, editor, templates, etc.
 */
export function GlobalCreateTaskDialog() {
	const dialogState = useStore(commandStore, (state) => state.createTaskDialog);
	const { organizations, account } = useLayoutData();

	// Auto-detect current orgId from URL if on an org route
	const orgMatch = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
	const urlOrgId = orgMatch?.params?.orgId;

	// Determine the active orgId: store > URL > single org fallback
	const resolvedOrgId = useMemo(() => {
		if (dialogState.orgId) return dialogState.orgId;
		if (urlOrgId) return urlOrgId;
		if (organizations.length === 1 && organizations[0]) return organizations[0].id;
		return "";
	}, [dialogState.orgId, urlOrgId, organizations]);

	const [orgData, setOrgData] = useState<OrgData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [loadedOrgId, setLoadedOrgId] = useState<string>("");

	// Fetch org data when orgId changes and dialog is open
	useEffect(() => {
		if (!dialogState.open || !resolvedOrgId || !account) {
			return;
		}

		// Skip if already loaded for this org
		if (resolvedOrgId === loadedOrgId && orgData) {
			return;
		}

		let cancelled = false;
		setIsLoading(true);

		getAdminOrganization({ data: { account, orgId: resolvedOrgId } })
			.then((result) => {
				if (cancelled) return;
				setOrgData({
					organization: result.organization,
					labels: result.labels,
					categories: result.categories,
					issueTemplates: result.issueTemplates,
					releases: result.releases,
				});
				setLoadedOrgId(resolvedOrgId);
			})
			.catch(() => {
				if (cancelled) return;
				setOrgData(null);
			})
			.finally(() => {
				if (cancelled) return;
				setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [dialogState.open, resolvedOrgId, account, loadedOrgId, orgData]);

	const handleOpenChange = useCallback((open: boolean) => {
		if (!open) {
			commandActions.closeCreateTaskDialog();
		}
	}, []);

	const handleOrganizationChange = useCallback(
		(orgId: string) => {
			// Update the store with the new orgId so the effect re-fetches
			commandActions.openCreateTaskDialog(orgId);
		},
		[],
	);

	// Don't render anything if dialog isn't open
	if (!dialogState.open) return null;

	// If we have no org data at all yet (first open), we can't render the dialog
	if (!orgData && !isLoading) {
		// Auto-select the first org if none resolved
		if (!resolvedOrgId && organizations.length > 0 && organizations[0]) {
			commandActions.openCreateTaskDialog(organizations[0].id);
		}
		return null;
	}

	// If still loading for the very first time (no previous data to show), return null briefly
	if (!orgData) return null;

	return (
		<CreateIssueDialog
			organization={orgData.organization}
			_labels={orgData.labels}
			categories={orgData.categories}
			issueTemplates={orgData.issueTemplates}
			releases={orgData.releases}
			open={dialogState.open}
			onOpenChange={handleOpenChange}
			organizations={organizations}
			onOrganizationChange={handleOrganizationChange}
			showTriggerButton={false}
			loading={isLoading}
		/>
	);
}
