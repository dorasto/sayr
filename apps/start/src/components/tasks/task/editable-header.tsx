"use client";

import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import { cn } from "@/lib/utils";
import { hasMembers, type TaskDetailOrganization } from "../types";

type ContentVisibility = "title" | "description" | "both";

interface TaskEditableHeaderProps {
	task: schema.TaskWithLabels;
	tasks: schema.TaskWithLabels[];
	setTasks: (tasks: schema.TaskWithLabels[]) => void;
	setSelectedTask: (task: schema.TaskWithLabels | null) => void;
	categories: schema.categoryType[];
	organization?: TaskDetailOrganization;
	showContent?: ContentVisibility;
	/** When provided, overrides the internal canEdit computation. */
	canEdit?: boolean;
}

export function TaskEditableHeader({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	categories,
	organization,
	showContent = "both",
	canEdit: canEditOverride,
}: TaskEditableHeaderProps) {
	const { account } = useLayoutData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { runWithToast, isFetching } = useToastAction();

	// Extract org member users for MentionView rendering (when organization has members)
	const orgMemberUsers = useMemo(() => {
		if (organization && hasMembers(organization)) {
			return organization.members.map((m) => m.user);
		}
		return undefined;
	}, [organization]);

	// Task-specific mounted state for skeleton loading
	const { value: isMounted, setValue: setIsMounted } = useStateManagement<boolean>(
		`task-${task.id}-header-mounted`,
		false,
		5000 // Garbage collect after 5 seconds of inactivity
	);

	// Set mounted to true after component mounts
	useEffect(() => {
		if (!isMounted) {
			// Small delay to ensure editor has time to initialize
			const timeout = setTimeout(() => setIsMounted(true), 50);
			return () => clearTimeout(timeout);
		}
	}, [isMounted, setIsMounted]);

	// Local state for editing
	const titleRef = useRef<HTMLDivElement>(null);
	const [description, setDescription] = useState<NodeJSON | undefined>(task.description || undefined);
	const [savedDescription, setSavedDescription] = useState<NodeJSON | undefined>(task.description || undefined);
	const [isSavingDescription, setIsSavingDescription] = useState(false);
	// True while a slash/mention/category/task autocomplete popover is open in the
	// description editor, so autosave can hold off instead of persisting an in-progress
	// trigger like "/tab" or "@jo".
	const [isDescriptionMenuOpen, setIsDescriptionMenuOpen] = useState(false);

	// Check if user can edit the task
	// When canEditOverride is provided (from parent with resolved permissions), use it directly.
	// Otherwise fall back to optimistic logic: creator can edit, org members can edit (backend verifies).
	const canEdit = useMemo(() => {
		if (canEditOverride !== undefined) return canEditOverride;

		if (!account?.id) return false;

		// Check if user is the task creator
		const isCreator = task.createdBy?.id === account.id;
		if (isCreator) return true;

		// Check if user is an assignee
		const isAssignee = task.assignees?.some((a) => a.id === account.id) ?? false;
		if (isAssignee) return true;

		// Check if user is an organization member
		const member =
			organization && hasMembers(organization)
				? organization.members.find((m) => m.user?.id === account.id)
				: undefined;
		if (!member) return false;

		// Allow UI editing for org members, backend will verify granular permissions
		return true;
	}, [canEditOverride, account?.id, task.createdBy?.id, task.assignees, organization]);

	// Handle title blur (save on blur)
	const handleTitleBlur = useCallback(async () => {
		const currentText = titleRef.current?.textContent || "";

		if (currentText === task.title || !currentText.trim()) {
			// Reset to original if empty or unchanged
			if (titleRef.current) {
				titleRef.current.textContent = task.title || "";
			}
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
			() => updateTaskAction(task.organizationId, task.id, { title: currentText }, sseClientId)
		);

		if (result?.success && result.data) {
			// Update both tasks list and selected task
			const updatedTasks = tasks.map((t) => (t.id === task.id && result.data ? result.data : t));
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
			if (titleRef.current) {
				titleRef.current.textContent = task.title || "";
			}
		}
	}, [task.title, task.organizationId, task.id, sseClientId, runWithToast, tasks, setTasks, setSelectedTask]);

	// Handle title key down (Enter to save, Escape to cancel)
	const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			e.currentTarget.blur();
		}
		if (e.key === "Escape") {
			// Reset content to original and blur
			if (titleRef.current) {
				titleRef.current.textContent = task.title || "";
			}
			e.currentTarget.blur();
		}
	};

	// Sync ref content when task changes or when mounted
	useEffect(() => {
		if (isMounted && titleRef.current) {
			titleRef.current.textContent = task.title || "";
		}
	}, [task.title, isMounted]);

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
							title: "Updated",
							// description: "Description updated successfully.",
						},
						error: {
							title: "Failed",
							description: "Could not save description.",
						},
					},
					() => updateTaskAction(task.organizationId, task.id, { description: processedContent }, sseClientId)
				);

				if (result?.success && result.data) {
					setDescription(processedContent);
					setSavedDescription(processedContent);
					// Update both tasks list and selected task
					const updatedTasks = tasks.map((t) => (t.id === task.id && result.data ? result.data : t));
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
		[task.organizationId, task.id, sseClientId, runWithToast, tasks, setTasks, setSelectedTask]
	);

	// Autosave the description a few seconds after the user stops editing
	// (typing, or toggling a checkbox), instead of requiring a manual "Update" click.
	const debouncedSaveDescription = useDebounceAsync(handleDescriptionSave, 3000);

	// Check if description has unsaved changes. Compares the full node JSON (not just
	// extracted text) so attribute-only changes - e.g. toggling a checkbox's `checked`
	// state - are detected even though the visible text is identical.
	const hasUnsavedChanges = useMemo(() => {
		return JSON.stringify(description) !== JSON.stringify(savedDescription);
	}, [description, savedDescription]);

	// Kick off (or reset) the autosave timer whenever the description changes. Hold off
	// entirely while a slash/mention/category/task popover is open - as soon as it closes
	// (selection made, or dismissed) this re-runs and starts a fresh idle countdown, so we
	// never persist an in-progress trigger like "/tab" or "@jo".
	useEffect(() => {
		if (!hasUnsavedChanges) return;
		if (isDescriptionMenuOpen) {
			debouncedSaveDescription.cancel();
			return;
		}
		debouncedSaveDescription(description)?.catch(() => {});
	}, [description, hasUnsavedChanges, isDescriptionMenuOpen, debouncedSaveDescription]);

	// Save immediately on blur instead of waiting out the rest of the idle timer -
	// a no-op if there's nothing pending (already saved, or held off for an open menu).
	const handleDescriptionBlur = useCallback(() => {
		debouncedSaveDescription.flush();
	}, [debouncedSaveDescription]);

	// Reset form when task changes. Cancel (don't flush) any pending autosave for the
	// previous task so we never persist stale content against the newly selected task.
	useEffect(() => {
		debouncedSaveDescription.cancel();
		setIsDescriptionMenuOpen(false);
		setDescription(task.description || undefined);
		setSavedDescription(task.description || undefined);
	}, [task.description, debouncedSaveDescription]);

	// Flush any pending autosave on unmount so navigating away right after an edit
	// doesn't drop it.
	useEffect(() => {
		return () => {
			debouncedSaveDescription.flush();
		};
	}, [debouncedSaveDescription]);

	// Skeleton loading state
	if (!isMounted) {
		return (
			<div className="flex flex-col gap-3">
				{showContent === "title" || showContent === "both" ? <Skeleton className="h-8 w-3/4" /> : null}

				{showContent === "description" || showContent === "both" ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				) : null}
			</div>
		);
	}

	if (!canEdit) {
		// Read-only view
		return (
			<div className="flex flex-col gap-1">
				{showContent === "title" || showContent === "both" ? (
					<div className="text-2xl font-bold outline-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50">
						{task.title}
					</div>
				) : null}

				{task.description && (showContent === "description" || showContent === "both") ? (
					<div className="w-full min-w-full">
						<Editor
							defaultContent={task.description}
							placeholder="No description"
							categories={categories}
							tasks={tasks}
							hideBlockHandle={true}
							readonly={true}
						/>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{/* Title Input - using contentEditable for multi-line wrapping */}
			{showContent === "title" || showContent === "both" ? (
				<>
					{/* biome-ignore lint/a11y/useSemanticElements: contentEditable div is intentional for text wrapping behavior */}
					<div
						ref={titleRef}
						role="textbox"
						tabIndex={isFetching ? -1 : 0}
						aria-label="Task title"
						contentEditable={!isFetching}
						suppressContentEditableWarning
						onBlur={handleTitleBlur}
						onKeyDown={handleTitleKeyDown}
						className="text-2xl font-bold outline-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50"
						data-placeholder="Task title"
					/>
				</>
			) : null}

			{/* Description Editor */}
			{showContent === "description" || showContent === "both" ? (
				<>
					<div className="w-full min-w-full">
						<Editor
							defaultContent={task.description || undefined}
							onChange={setDescription}
							// placeholder="Add a description for this task..."
							firstLinePlaceholder="Task description"
							categories={categories}
							tasks={tasks}
							hideBlockHandle={true}
							onMenuOpenChange={setIsDescriptionMenuOpen}
							onBlur={handleDescriptionBlur}
						/>
						<div className={cn("flex w-full h-4", !(isSavingDescription || hasUnsavedChanges) && "invisible")}>
							<span className="text-xs text-muted-foreground ml-auto">
								{isSavingDescription ? "Saving..." : "Unsaved changes"}
							</span>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
