"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { useLayoutData } from "@/components/generic/Context";
import { updateTaskAction } from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";

type ContentVisibility = "title" | "description" | "both";

interface TaskEditableHeaderProps {
   task: schema.TaskWithLabels;
   tasks: schema.TaskWithLabels[];
   setTasks: (tasks: schema.TaskWithLabels[]) => void;
   setSelectedTask: (task: schema.TaskWithLabels | null) => void;
   availableUsers: schema.userType[];
   categories: schema.categoryType[];
   organization?:
     | schema.OrganizationWithMembers
     | { id: string; name: string; slug: string; logo: string | null };
   showContent?: ContentVisibility;
}

export function TaskEditableHeader({
  task,
  tasks,
  setTasks,
  setSelectedTask,
  availableUsers,
  categories,
  organization,
  showContent = "both",
}: TaskEditableHeaderProps) {
  const { account } = useLayoutData();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast, isFetching } = useToastAction();

  // Task-specific mounted state for skeleton loading
  const { value: isMounted, setValue: setIsMounted } =
    useStateManagement<boolean>(
      `task-${task.id}-header-mounted`,
      false,
      5000, // Garbage collect after 5 seconds of inactivity
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
  const [description, setDescription] = useState<NodeJSON | undefined>(
    task.description || undefined,
  );
  const [savedDescription, setSavedDescription] = useState<
    NodeJSON | undefined
  >(task.description || undefined);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    setDescription(task.description || undefined);
    setSavedDescription(task.description || undefined);
  }, [task.description]);

  // Check if user can edit the task
  // User can edit if they are the creator OR if they are an admin (administrator permission)
  const canEdit = useMemo(() => {
    if (!account?.id) return false;

    // Check if user is the task creator
    const isCreator = task.createdBy?.id === account.id;
    if (isCreator) return true;

    // Check if user is an organization admin
    // Find the user's member record and their teams to check permissions
    const hasMembers = organization && "members" in organization;
    const member = hasMembers
      ? organization.members.find((m) => m.user?.id === account.id)
      : undefined;
    if (!member) return false;

    // For now, we check if the user has the administrator permission via their teams
    // This would need to be expanded based on how team permissions are loaded
    // For simplicity, we'll also check if they have editAny permission on tasks
    // This requires the member to have teams loaded with permissions
    // A simpler approach: check if they're the org owner (first member or specific role)
    // Since we don't have direct access to team permissions here, we'll rely on
    // the backend to verify permissions
    return true; // Allow UI editing, backend will verify
  }, [account?.id, task.createdBy?.id, organization]);

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
      () =>
        updateTaskAction(
          task.organizationId,
          task.id,
          { title: currentText },
          wsClientId,
        ),
    );

    if (result?.success && result.data) {
      // Update both tasks list and selected task
      const updatedTasks = tasks.map((t) =>
        t.id === task.id && result.data ? result.data : t,
      );
      setTasks(updatedTasks);
      setSelectedTask(result.data);
      sendWindowMessage(
        window,
        {
          type: "timeline-update",
          payload: task.id,
        },
        "*",
      );
    } else {
      // Reset on failure
      if (titleRef.current) {
        titleRef.current.textContent = task.title || "";
      }
    }
  }, [
    task.title,
    task.organizationId,
    task.id,
    wsClientId,
    runWithToast,
    tasks,
    setTasks,
    setSelectedTask,
  ]);

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
          "update-task-description",
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
              wsClientId,
            ),
        );

        if (result?.success && result.data) {
          setDescription(processedContent);
          setSavedDescription(processedContent);
          // Update both tasks list and selected task
          const updatedTasks = tasks.map((t) =>
            t.id === task.id && result.data ? result.data : t,
          );
          setTasks(updatedTasks);
          setSelectedTask(result.data);
          sendWindowMessage(
            window,
            {
              type: "timeline-update",
              payload: task.id,
            },
            "*",
          );
        }
      } finally {
        setIsSavingDescription(false);
      }
    },
    [
      task.organizationId,
      task.id,
      wsClientId,
      runWithToast,
      tasks,
      setTasks,
      setSelectedTask,
    ],
  );

  // Check if description has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const currentText = extractTextContent(description);
    const savedText = extractTextContent(savedDescription);
    return currentText !== savedText;
  }, [description, savedDescription]);

  // Skeleton loading state
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-3">
        {showContent === "title" || showContent === "both" ? (
          <Skeleton className="h-8 w-3/4" />
        ) : null}

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

        {task.description &&
        (showContent === "description" || showContent === "both") ? (
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
        </>
      ) : null}
    </div>
  );
}
