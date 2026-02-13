"use client";

import {
	IconBuilding,
	IconCheckbox,
	IconPlus,
	IconSwitchHorizontal,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers global commands available from any admin page:
 * - Create task (opens global create task dialog)
 * - My Tasks (navigate to /mine)
 * - Switch organization (sub-view with org list)
 */
export function useGlobalCommands() {
	const navigate = useNavigate();
	const { organizations } = useLayoutData();

	const commands: CommandMap = useMemo(() => {
		const orgSwitchItems = organizations.map((org) => ({
			id: `switch-org-${org.id}`,
			label: org.name,
			icon: <IconBuilding size={16} className="opacity-60" aria-hidden="true" />,
			action: () => navigate({ to: "/$orgId", params: { orgId: org.id } }),
			keywords: org.slug,
		}));

		return {
			root: [
				{
					heading: "Quick actions",
					priority: 10,
					items: [
						{
							id: "global-create-task",
							label: "Create task",
							icon: <IconPlus size={16} className="opacity-60" aria-hidden="true" />,
							action: () => commandActions.openCreateTaskDialog(),
							keywords: "new issue add",
							shortcut: "C",
						},
						{
							id: "global-my-tasks",
							label: "My Tasks",
							icon: <IconCheckbox size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/mine" }),
							keywords: "assigned personal",
						},
						{
							id: "global-switch-org",
							label: "Switch organization",
							icon: <IconSwitchHorizontal size={16} className="opacity-60" aria-hidden="true" />,
							subId: "switch-org",
							keywords: "workspace team",
							show: organizations.length > 1,
						},
					],
				},
			],
			"switch-org": [
				{
					heading: "Organizations",
					priority: 10,
					items: orgSwitchItems,
				},
			],
		};
	}, [navigate, organizations]);

	useRegisterCommands("global-commands", commands);
}
