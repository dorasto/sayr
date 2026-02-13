"use client";

import { IconFilter, IconPlus } from "@tabler/icons-react";
import { useMemo } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers task-list-specific commands when on the tasks page:
 * - Create task (pre-selects current org)
 * - Filter tasks
 */
export function useTasksCommands() {
	const { organization } = useLayoutOrganization();

	const commands: CommandMap = useMemo(() => {
		return {
			root: [
				{
					heading: "Tasks",
					priority: 10,
					items: [
						{
							id: "tasks-create",
							label: "Create task",
							icon: <IconPlus size={16} className="opacity-60" aria-hidden="true" />,
							action: () => commandActions.openCreateTaskDialog(organization.id),
							keywords: "new issue add",
							shortcut: "C",
						},
						{
							id: "tasks-filter",
							label: "Filter tasks",
							icon: <IconFilter size={16} className="opacity-60" aria-hidden="true" />,
							action: () => {
								// Focus the filter input on the tasks page
								commandActions.close();
								setTimeout(() => {
									const filterInput = document.querySelector<HTMLInputElement>(
										'[data-filter-input="true"]',
									);
									filterInput?.focus();
								}, 200);
							},
							keywords: "search find sort",
							shortcut: "F",
						},
					],
				},
			],
		};
	}, [organization.id]);

	useRegisterCommands("tasks-commands", commands);
}
