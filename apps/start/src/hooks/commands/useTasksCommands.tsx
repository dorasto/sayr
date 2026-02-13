"use client";

import { IconFilter } from "@tabler/icons-react";
import { useMemo } from "react";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers task-list-specific commands when on the tasks page:
 * - Filter tasks
 *
 * Note: "Create task" is not registered here because useOrgCommands already
 * provides "Create task in [org]" which pre-selects the current org.
 */
export function useTasksCommands() {
	const commands: CommandMap = useMemo(() => {
		return {
			root: [
				{
					heading: "Tasks",
					priority: 5,
					items: [
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
	}, []);

	useRegisterCommands("tasks-commands", commands);
}
