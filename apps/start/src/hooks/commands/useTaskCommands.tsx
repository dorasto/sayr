"use client";

import { IconArrowLeft, IconCopy, IconLink } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers single-task-specific commands when viewing a task:
 * - Copy task link
 * - Copy task ID
 * - Go back to tasks list
 */
export function useTaskCommands() {
	const navigate = useNavigate();
	const { organization } = useLayoutOrganization();
	const { task } = useLayoutTask();

	const commands: CommandMap = useMemo(() => {
		const orgId = organization.id;

		return {
			root: [
				{
					heading: `Task #${task.shortId}`,
					priority: 5,
					items: [
						{
							id: `task-copy-link-${task.id}`,
							label: "Copy task link",
							icon: <IconLink size={16} className="opacity-60" aria-hidden="true" />,
							action: () => {
								const url = `${window.location.origin}/${orgId}/tasks/${task.shortId}`;
								navigator.clipboard.writeText(url);
							},
							closeOnSelect: true,
							keywords: "url share",
						},
						{
							id: `task-copy-id-${task.id}`,
							label: `Copy task ID (#${task.shortId})`,
							icon: <IconCopy size={16} className="opacity-60" aria-hidden="true" />,
							action: () => {
								navigator.clipboard.writeText(`#${task.shortId}`);
							},
							closeOnSelect: true,
							keywords: "identifier number",
						},
						{
							id: `task-go-back-${task.id}`,
							label: "Go back to tasks list",
							icon: <IconArrowLeft size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/$orgId/tasks", params: { orgId } }),
							keywords: "return list overview",
						},
					],
				},
			],
		};
	}, [navigate, organization.id, task.id, task.shortId]);

	useRegisterCommands("task-commands", commands);
}
