"use client";

import {
	IconCheckbox,
	IconEye,
	IconPlus,
	IconRocket,
	IconSettings,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers org-specific commands when inside an organization route:
 * - Create task in [org name]
 * - Go to tasks, releases, views
 * - Organization settings
 */
export function useOrgCommands() {
	const navigate = useNavigate();
	const { organization } = useLayoutOrganization();

	const commands: CommandMap = useMemo(() => {
		const orgId = organization.id;
		const orgName = organization.name;

		return {
			root: [
				{
					heading: orgName,
					priority: 10,
					items: [
						{
							id: `org-create-task-${orgId}`,
							label: `Create task in ${orgName}`,
							icon: <IconPlus size={16} className="opacity-60" aria-hidden="true" />,
							action: () => commandActions.openCreateTaskDialog(orgId),
							keywords: "new issue add",
						},
						{
							id: `org-go-tasks-${orgId}`,
							label: "Go to tasks",
							icon: <IconCheckbox size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/$orgId/tasks", params: { orgId } }),
							keywords: "issues list board",
						},
						{
							id: `org-go-releases-${orgId}`,
							label: "Go to releases",
							icon: <IconRocket size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/$orgId/releases", params: { orgId } }),
							keywords: "versions milestones",
						},
						{
							id: `org-go-views-${orgId}`,
							label: "Go to views",
							icon: <IconEye size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/$orgId/views", params: { orgId } }),
							keywords: "saved filters custom",
						},
						{
							id: `org-settings-${orgId}`,
							label: "Organization settings",
							icon: <IconSettings size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/settings/org/$orgId", params: { orgId } }),
							keywords: "preferences configuration",
						},
					],
				},
			],
		};
	}, [navigate, organization]);

	useRegisterCommands("org-commands", commands);
}
