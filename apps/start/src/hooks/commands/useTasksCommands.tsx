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
								// Open the board's filter builder (the toolbar's Filter button) once the
								// palette's close animation is done — same target /home's command uses.
								commandActions.close();
								setTimeout(() => {
									document
										.querySelector<HTMLButtonElement>('[data-command-target="filter-builder-trigger"]')
										?.click();
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
