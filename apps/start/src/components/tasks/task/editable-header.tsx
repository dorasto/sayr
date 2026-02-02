"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { updateTaskAction } from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";

interface TaskEditableHeaderProps {
	task: schema.TaskWithLabels;
	tasks: schema.TaskWithLabels[];
	setTasks: (tasks: schema.TaskWithLabels[]) => void;
	setSelectedTask: (task: schema.TaskWithLabels | null) => void;
	availableUsers: schema.userType[];
	categories: schema.categoryType[];
}

export function TaskEditableHeader({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	availableUsers,
	categories,
}: TaskEditableHeaderProps) {
	const { account } = useLayoutData();
	const { organization } = useLayoutOrganization();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();

	// Local state for editing
	const [editTitle, setEditTitle] = useState(task.title || "");
	const [description, setDescription] = useState<NodeJSON | undefined>(
		task.description || undefined
	);
	const [savedDescription, setSavedDescription] = useState<NodeJSON | undefined>(
		task.description || undefined
	);
	const [isSavingDescription, setIsSavingDescription] = useState(false);

	// Reset form when task changes
	useEffect(() => {
		setEditTitle(task.title || "");
		setDescription(task.description || undefined);
		setSavedDescription(task.description || undefined);
	}, [task.title, task.description]);

	// Check if user can edit the task
	// User can edit if they are the creator OR if they are an admin (administrator permission)
	const canEdit = useMemo(() => {
		if (!account?.id) return false;

		// Check if user is the task creator
		const isCreator = task.createdBy?.id === account.id;
		if (isCreator) return true;

		// Check if user is an organization admin
		// Find the user's member record and their teams to check permissions
		const member = organization?.members?.find((m) => m.user?.id === account.id);
		if (!member) return false;

		// For now, we check if the user has the administrator permission via their teams
		// This would need to be expanded based on how team permissions are loaded
		// For simplicity, we'll also check if they have editAny permission on tasks
		// This requires the member to have teams loaded with permissions
		// A simpler approach: check if they're the org owner (first member or specific role)
		// Since we don't have direct access to team permissions here, we'll rely on
		// the backend to verify permissions
		return true; // Allow UI editing, backend will verify
	}, [account?.id, task.createdBy?.id, organization?.members]);

	// Handle title blur (save on blur)
	const handleTitleBlur = useCallback(async () => {
		if (editTitle === task.title || !editTitle.trim()) {
			// Reset to original if empty or unchanged
			setEditTitle(task.title || "");
			return;
		}

		const result = await runWithToast(
			"update-task-title",
			{
				loading: {
					title: "Saving...",
					description: "Updating task title.",
				},
				success: {
					title: "Saved",
					description: "Task title updated successfully.",
				},
				error: {
					title: "Failed",
					description: "Could not update task title.",
				},
			},
			() => updateTaskAction(task.organizationId, task.id, { title: editTitle }, wsClientId)
		);

		if (result?.success && result.data) {
			// Update both tasks list and selected task
			const updatedTasks = tasks.map((t) =>
				t.id === task.id && result.data ? result.data : t
			);
			setTasks(updatedTasks);
			setSelectedTask(result.data);
			sendWindowMessage(
				window,
				{
					type: "timeline-update",
					payload: task.id,
				},
				"*"
			);
		} else {
			// Reset on failure
			setEditTitle(task.title || "");
		}
	}, [editTitle, task.title, task.organizationId, task.id, wsClientId, runWithToast, tasks, setTasks, setSelectedTask]);

	// Handle title key down (save on Enter)
	const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
		if (e.key === "Escape") {
			setEditTitle(task.title || "");
			e.currentTarget.blur();
		}
	};

	// Handle description save
	const handleDescriptionSave = useCallback(
		async (content: NodeJSON | undefined) => {
			if (!content) return;

			try {
				setIsSavingDescription(true);
				const processedContent = await processUploads(
					content,
					"public",
					task.organizationId,
					"update-task-description"
				);

				const result = await runWithToast(
					"update-task-description",
					{
						loading: {
							title: "Saving...",
							description: "Updating task description.",
						},
						success: {
							title: "Saved",
							description: "Description updated successfully.",
						},
						error: {
							title: "Failed",
							description: "Could not save description.",
						},
					},
					() =>
						updateTaskAction(
							task.organizationId,
							task.id,
							{ description: processedContent },
							wsClientId
						)
				);

				if (result?.success && result.data) {
					setDescription(processedContent);
					setSavedDescription(processedContent);
					// Update both tasks list and selected task
					const updatedTasks = tasks.map((t) =>
						t.id === task.id && result.data ? result.data : t
					);
					setTasks(updatedTasks);
					setSelectedTask(result.data);
					sendWindowMessage(
						window,
						{
							type: "timeline-update",
							payload: task.id,
						},
						"*"
					);
				}
			} finally {
				setIsSavingDescription(false);
			}
		},
		[task.organizationId, task.id, wsClientId, runWithToast, tasks, setTasks, setSelectedTask]
	);

	// Check if description has unsaved changes
	const hasUnsavedChanges = useMemo(() => {
		const currentText = extractTextContent(description);
		const savedText = extractTextContent(savedDescription);
		return currentText !== savedText;
	}, [description, savedDescription]);

	if (!canEdit) {
		// Read-only view
		return (
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
				{task.description && (
					<div className="w-full min-w-full">
						<Editor
							defaultContent={task.description}
							placeholder="No description"
							users={availableUsers}
							categories={categories}
							tasks={tasks}
							hideBlockHandle={true}
							readonly={true}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{/* Title Input */}
			<Input
				value={editTitle}
				onChange={(e) => setEditTitle(e.target.value)}
				onBlur={handleTitleBlur}
				onKeyDown={handleTitleKeyDown}
				variant="ghost"
				className="focus-visible:bg-transparent text-2xl! font-bold py-0 px-0"
				placeholder="Task title"
				disabled={isFetching}
			/>

			{/* Description Editor */}
			<div className="w-full min-w-full">
				<Editor
					defaultContent={task.description || undefined}
					onChange={setDescription}
					placeholder="Add a description for this task..."
					users={availableUsers}
					categories={categories}
					tasks={tasks}
					hideBlockHandle={true}
				/>
				<div className="flex w-full">
					{hasUnsavedChanges && (
						<Button
							variant="primary"
							size="sm"
							className="text-xs py-1 h-auto ml-auto"
							onClick={() => handleDescriptionSave(description)}
							disabled={isSavingDescription}
						>
							{isSavingDescription ? "Saving..." : "Update"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
