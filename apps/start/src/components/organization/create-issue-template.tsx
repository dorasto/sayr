"use client";

import { useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconCategory,
  IconDeviceFloppy,
  IconLabel,
  IconLock,
  IconLockOpen2,
  IconPlus,
  IconRocket,
  IconTemplate,
  IconTrash,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import {
  createIssueTemplateAction,
  deleteIssueTemplateAction,
  editIssueTemplateAction,
} from "@/lib/fetches/organization";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import GlobalTaskStatus from "@/components/tasks/shared/status";
import GlobalTaskPriority from "@/components/tasks/shared/priority";
import GlobalTaskLabels from "@/components/tasks/shared/label";
import GlobalTaskCategory from "@/components/tasks/shared/category";
import GlobalTaskAssignees from "@/components/tasks/shared/assignee";
import GlobalTaskRelease from "@/components/tasks/shared/release";
import RenderIcon from "@/components/generic/RenderIcon";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import {
  Tile,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { formatDateCompact } from "@repo/util";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import type { NodeJSON } from "prosekit/core";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";

// Dialog size configuration - mirrors CreateIssueDialog sizing
const DIALOG_SIZES = {
  collapsed: {
    width: "min(38rem, calc(100vw - 2rem))",
    height: "auto",
    minHeight: "18rem",
    maxHeight: "min(38rem, calc(100vh - 4rem))",
  },
  expanded: {
    width: "min(50rem, calc(100vw - 2rem))",
    height: "min(40rem, calc(100vh - 6rem))",
    minHeight: "min(40rem, calc(100vh - 6rem))",
    maxHeight: "min(40rem, calc(100vh - 6rem))",
  },
  transition: {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.25,
  },
} as const;

interface Props {
  orgId: string;
  setIssueTemplates: (newValue: schema.issueTemplateWithRelations[]) => void;
  template?: schema.issueTemplateWithRelations;
  availableLabels: schema.labelType[];
  availableCategories: schema.categoryType[];
  availableUsers: schema.userType[];
  releases?: schema.releaseType[];
  mode?: "create" | "edit";
}

export default function CreateIssueTemplate({
  orgId,
  setIssueTemplates,
  template,
  availableLabels,
  availableCategories,
  availableUsers,
  releases = [],
  mode = "create",
}: Props) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { setValue: setMentionContext } =
    useStateManagement<MentionContext | null>("mentionContext", null);

  // Set mentionContext so the Editor's useMentionUsers hook can fetch org members
  useEffect(() => {
    if (orgId) {
      setMentionContext({ orgId });
    }
  }, [orgId, setMentionContext]);

  const [name, setName] = useState(template?.name || "");
  const [titlePrefix, setTitlePrefix] = useState(template?.titlePrefix || "");
  const [description, setDescription] = useState<NodeJSON | undefined>(
    template?.description ? (template.description as NodeJSON) : undefined,
  );
  const [status, setStatus] = useState<string | undefined>(
    template?.status || undefined,
  );
  const [priority, setPriority] = useState<string | undefined>(
    template?.priority || undefined,
  );
  const [categoryId, setCategoryId] = useState<string>(
    template?.categoryId || "",
  );
  const [labelIds, setLabelIds] = useState<string[]>(
    template?.labels?.map((l) => l.id) || [],
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    template?.assignees?.map((a) => a.id) || [],
  );
  const [visible, setVisible] = useState<"public" | "private" | undefined>(
    (template?.visible as "public" | "private") || undefined,
  );
  const [releaseId, setReleaseId] = useState<string>(template?.releaseId || "");
  const { runWithToast, isFetching } = useToastAction();
  const isEditMode = mode === "edit" && template;
  const [resetKey, setResetKey] = useState(0);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [expand, setExpand] = useState(false);
  const isMobile = useIsMobile();

  const initialContent = useMemo(() => {
    return template?.description
      ? (template.description as NodeJSON)
      : undefined;
  }, [template?.id]);

  useEffect(() => {
    if (isEditMode) {
      setName(template?.name || "");
      setTitlePrefix(template?.titlePrefix || "");
      setDescription(
        template?.description ? (template.description as NodeJSON) : undefined,
      );
      setStatus(template?.status || undefined);
      setPriority(template?.priority || undefined);
      setCategoryId(template?.categoryId || "");
      setLabelIds(template?.labels?.map((l) => l.id) || []);
      setAssigneeIds(template?.assignees?.map((a) => a.id) || []);
      setVisible((template?.visible as "public" | "private") || undefined);
      setReleaseId(template?.releaseId || "");
    }
  }, [isEditMode, template]);

  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return (
      name !== template?.name ||
      titlePrefix !== (template?.titlePrefix || "") ||
      JSON.stringify(description) !==
        JSON.stringify(template?.description || undefined) ||
      status !== (template?.status || undefined) ||
      priority !== (template?.priority || undefined) ||
      categoryId !== (template?.categoryId || "") ||
      JSON.stringify(labelIds.sort()) !==
        JSON.stringify((template?.labels?.map((l) => l.id) || []).sort()) ||
      JSON.stringify(assigneeIds.sort()) !==
        JSON.stringify((template?.assignees?.map((a) => a.id) || []).sort()) ||
      visible !== ((template?.visible as "public" | "private") || undefined) ||
      releaseId !== (template?.releaseId || "")
    );
  }, [
    name,
    titlePrefix,
    description,
    status,
    priority,
    categoryId,
    labelIds,
    assigneeIds,
    visible,
    releaseId,
    template,
    isEditMode,
  ]);

  const selectedLabels = useMemo(
    () => availableLabels.filter((label) => labelIds.includes(label.id)),
    [availableLabels, labelIds],
  );

  const selectedCategory = useMemo(
    () => availableCategories.find((c) => c.id === categoryId),
    [availableCategories, categoryId],
  );

  const selectedAssignees = useMemo(
    () => availableUsers.filter((user) => assigneeIds.includes(user.id)),
    [availableUsers, assigneeIds],
  );

  const selectedRelease = useMemo(
    () => releases.find((r) => r.id === releaseId),
    [releases, releaseId],
  );

  // Create a draft task-like object for the shared components
  const draftTask = useMemo<schema.TaskWithLabels>(
    () => ({
      id: template?.id || "draft",
      organizationId: orgId,
      shortId: 0,
      visible: visible || "public",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "",
      description: [] as unknown as schema.NodeJSON,
      status: (status || "backlog") as schema.TaskWithLabels["status"],
      priority: (priority || "none") as schema.TaskWithLabels["priority"],
      createdBy: null,
      labels: selectedLabels,
      assignees: selectedAssignees,
      category: categoryId || "",
      releaseId: releaseId || null,
      voteCount: 0,
    }),
    [
      orgId,
      template?.id,
      status,
      priority,
      selectedLabels,
      selectedAssignees,
      categoryId,
      visible,
      releaseId,
    ],
  );

  const resolvedStatus = status || "backlog";
  const resolvedPriority = priority || "none";
  const statusconfig =
    statusConfig[resolvedStatus as keyof typeof statusConfig];
  const priorityconfig =
    priorityConfig[resolvedPriority as keyof typeof priorityConfig];

  const handleCreate = async () => {
    const data = await runWithToast(
      "create-issue-template",
      {
        loading: {
          title: "Creating template...",
          description: "Please wait while we create the template.",
        },
        success: {
          title: "Template created",
          description: "The template has been successfully created.",
        },
        error: {
          title: "Failed to create template",
          description: "An error occurred while creating the template.",
        },
      },
      async () => {
        const updatedDescription = description
          ? await processUploads(
              description,
              "public",
              orgId,
              "create-issue-template",
            )
          : undefined;

        return createIssueTemplateAction(
          orgId,
          {
            name,
            titlePrefix: titlePrefix || undefined,
            description: updatedDescription,
            status: status || undefined,
            priority: priority || undefined,
            categoryId: categoryId || undefined,
            labelIds,
            assigneeIds,
            visible: visible || undefined,
            releaseId: releaseId || undefined,
          },
          wsClientId,
        );
      },
    );
    if (data?.success && data.data) {
      setIssueTemplates(data.data);
      setName("");
      setTitlePrefix("");
      setDescription(undefined);
      setStatus(undefined);
      setPriority(undefined);
      setCategoryId("");
      setLabelIds([]);
      setAssigneeIds([]);
      setVisible(undefined);
      setReleaseId("");
      setResetKey((prev) => prev + 1);
      setOpen(false);
      setExpand(false);
    }
  };

  const handleEdit = async () => {
    if (!template) return;
    const data = await runWithToast(
      "edit-issue-template",
      {
        loading: {
          title: "Updating template...",
        },
        success: {
          title: "Template updated",
        },
        error: {
          title: "Failed to update template",
          description: "An error occurred while updating the template.",
        },
      },
      async () => {
        const updatedDescription = description
          ? await processUploads(
              description,
              "public",
              orgId,
              "edit-issue-template",
            )
          : undefined;

        return editIssueTemplateAction(
          orgId,
          {
            id: template.id,
            name,
            titlePrefix: titlePrefix || undefined,
            description: updatedDescription,
            status: status || undefined,
            priority: priority || undefined,
            categoryId: categoryId || undefined,
            labelIds,
            assigneeIds,
            visible: visible || undefined,
            releaseId: releaseId || undefined,
          },
          wsClientId,
        );
      },
    );
    if (data?.success && data.data) {
      setIssueTemplates(data.data);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    const data = await runWithToast(
      "delete-issue-template",
      {
        loading: {
          title: "Deleting template...",
          description: "Please wait while we delete the template.",
        },
        success: {
          title: "Template deleted",
          description: "The template has been successfully deleted.",
        },
        error: {
          title: "Failed to delete template",
          description: "An error occurred while deleting the template.",
        },
      },
      () => deleteIssueTemplateAction(orgId, { id: template.id }, wsClientId),
    );
    if (data?.success && data.data) {
      setConfirmDeleteOpen(false);
      setIssueTemplates(data.data);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full text-left rounded-lg bg-card hover:bg-accent transition-colors p-0 border-0 cursor-pointer",
        )}
      >
        <Tile variant={"transparent"} className="md:w-full">
          <TileHeader className="w-full text-left">
            <TileTitle className="flex items-center gap-2 w-full">
              <TileIcon>
                {isEditMode ? <IconTemplate /> : <IconPlus />}
              </TileIcon>
              {template?.name || "Create new template"}
            </TileTitle>
            {isEditMode && (
              <TileDescription>
                <Label variant={"description"}>
                  Created on {formatDateCompact(template.createdAt as Date)}
                </Label>
              </TileDescription>
            )}
          </TileHeader>
        </Tile>
      </button>

      <AdaptiveDialog open={open} onOpenChange={setOpen}>
        <AdaptiveDialogContent
          className={cn(
            "z-50 border",
            visible === "private" && "border-primary/50",
            !isMobile && "md:max-w-none! md:w-auto! md:h-auto!",
            !isMobile && "top-[15%]! translate-y-0!",
          )}
          childClassName={cn(
            !isMobile && "flex flex-col min-h-0 overflow-hidden",
          )}
          showClose={false}
        >
          <motion.div
            className={cn(!isMobile && "flex flex-col")}
            initial={false}
            animate={{
              width: !isMobile
                ? expand
                  ? DIALOG_SIZES.expanded.width
                  : DIALOG_SIZES.collapsed.width
                : "100%",
            }}
            transition={DIALOG_SIZES.transition}
            style={{
              height: !isMobile
                ? expand
                  ? DIALOG_SIZES.expanded.height
                  : "auto"
                : "auto",
              minHeight: !isMobile
                ? expand
                  ? DIALOG_SIZES.expanded.minHeight
                  : DIALOG_SIZES.collapsed.minHeight
                : undefined,
              maxHeight: !isMobile
                ? expand
                  ? DIALOG_SIZES.expanded.maxHeight
                  : DIALOG_SIZES.collapsed.maxHeight
                : undefined,
              transition: !isMobile
                ? "height 0.25s ease-in-out, min-height 0.25s ease-in-out, max-height 0.25s ease-in-out"
                : undefined,
            }}
          >
            <AdaptiveDialogHeader className={cn(!isMobile && "pb-0!")}>
              <AdaptiveDialogTitle asChild>
                <div className="flex items-center gap-1 w-full">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <IconTemplate className="h-4 w-4 text-muted-foreground" />
                    {isEditMode ? "Edit template" : "Create template"}
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    {!isMobile && (
                      <Button
                        variant={"ghost"}
                        size={"icon"}
                        className="h-7 w-7"
                        onClick={() => setExpand(!expand)}
                      >
                        {expand ? (
                          <IconArrowsDiagonalMinimize2 className="size-4" />
                        ) : (
                          <IconArrowsDiagonal className="size-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      className="h-7 w-7"
                      onClick={() => setOpen(false)}
                    >
                      <IconX className="size-4" />
                    </Button>
                  </div>
                </div>
              </AdaptiveDialogTitle>
              <AdaptiveDialogDescription className="sr-only">
                {isEditMode
                  ? "Edit an existing issue template"
                  : "Create a new issue template"}
              </AdaptiveDialogDescription>
            </AdaptiveDialogHeader>

            <div className="relative flex-1 flex flex-col min-h-0">
              <div
                className={cn(
                  "flex flex-col gap-3 w-full p-3",
                  !isMobile && "flex-1 min-h-0 pt-0!",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-3 w-full",
                    !isMobile && "flex-1 min-h-0",
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <Input
                      placeholder="Template name"
                      variant={"strong"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-0 p-0 md:w-2/3"
                    />
                    <Input
                      placeholder="Title prefix (e.g. [BUG])"
                      variant={"strong"}
                      value={titlePrefix}
                      onChange={(e) => setTitlePrefix(e.target.value)}
                      className="px-0 p-0 md:w-1/3 text-sm! text-right "
                    />
                  </div>

                  <div
                    className={cn(
                      "w-full transition-all rounded-lg",
                      !isMobile && "flex-1 min-h-24 overflow-y-auto",
                    )}
                  >
                    <Editor
                      key={template?.id || `new-${resetKey}`}
                      onChange={setDescription}
                      defaultContent={initialContent}
                      categories={availableCategories}
                      tasks={[]}
                      hideBlockHandle={true}
                      firstLinePlaceholder="Template description"
                    />
                  </div>

                  <div className="flex items-center flex-wrap gap-1 w-full mt-auto shrink-0">
                    <GlobalTaskStatus
                      task={draftTask}
                      editable
                      onChange={(value) => setStatus(value || undefined)}
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7"
                          size={"sm"}
                        >
                          {statusconfig?.icon(
                            `h-3.5 w-3.5 ${statusconfig?.className || ""}`,
                          )}
                          {statusconfig?.label || "Status"}
                        </Button>
                      }
                    />
                    <GlobalTaskPriority
                      task={draftTask}
                      editable
                      onChange={(value) => setPriority(value || undefined)}
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7"
                          size={"sm"}
                        >
                          {priorityconfig?.icon(
                            `h-3.5 w-3.5 ${priorityconfig?.className || ""}`,
                          )}
                          {priorityconfig?.label || "Priority"}
                        </Button>
                      }
                    />
                    <GlobalTaskLabels
                      task={draftTask}
                      editable
                      availableLabels={availableLabels}
                      onLabelsChange={setLabelIds}
                      customChildren
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7 line-clamp-1"
                          size={"sm"}
                        >
                          {selectedLabels.length > 1 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                {selectedLabels.map((label) => (
                                  <span
                                    key={label.id}
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor: label.color || "#cccccc",
                                    }}
                                  />
                                ))}
                              </div>
                              <span>{selectedLabels.length} labels</span>
                            </div>
                          ) : selectedLabels.length === 1 ? (
                            <div className="flex items-center">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full mr-2"
                                style={{
                                  backgroundColor:
                                    selectedLabels[0]?.color || "#cccccc",
                                }}
                              />
                              <span>{selectedLabels[0]?.name}</span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-2">
                              <IconLabel className="h-3.5 w-3.5 mr-1" />
                              Labels
                            </span>
                          )}
                        </Button>
                      }
                    />
                    <GlobalTaskAssignees
                      task={draftTask}
                      editable
                      availableUsers={availableUsers}
                      onChange={(value) => setAssigneeIds(value)}
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7 line-clamp-1"
                          size={"sm"}
                        >
                          {selectedAssignees.length > 1 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                {selectedAssignees.map((assignee) => (
                                  <Avatar
                                    key={assignee.id}
                                    className="h-4 w-4 border border-background"
                                  >
                                    <AvatarImage
                                      src={assignee.image || undefined}
                                      alt={assignee.name}
                                    />
                                    <AvatarFallback className="text-[8px]">
                                      {assignee.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              <span>{selectedAssignees.length} assignees</span>
                            </div>
                          ) : selectedAssignees.length === 1 ? (
                            <div className="flex items-center">
                              <Avatar className="h-4 w-4 mr-2">
                                <AvatarImage
                                  src={selectedAssignees[0]?.image || undefined}
                                  alt={selectedAssignees[0]?.name}
                                />
                                <AvatarFallback className="text-[8px]">
                                  {selectedAssignees[0]?.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{selectedAssignees[0]?.name}</span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-2">
                              <IconUserPlus className="h-3.5 w-3.5 mr-1" />
                              Assignees
                            </span>
                          )}
                        </Button>
                      }
                    />
                    <GlobalTaskCategory
                      task={draftTask}
                      editable
                      categories={availableCategories}
                      onChange={(value) => setCategoryId(value)}
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7"
                          size={"sm"}
                        >
                          {selectedCategory ? (
                            <>
                              <RenderIcon
                                iconName={
                                  selectedCategory.icon || "IconCircleFilled"
                                }
                                className="size-3.5! [&_svg]:size-3.5! mr-1"
                                color={selectedCategory.color || undefined}
                                button
                              />
                              {selectedCategory.name}
                            </>
                          ) : (
                            <>
                              <IconCategory className="h-3.5 w-3.5 mr-1" />
                              Category
                            </>
                          )}
                        </Button>
                      }
                    />
                    <Button
                      variant={"primary"}
                      className={cn(
                        "w-fit text-xs h-7",
                        visible === "private" && "border-primary/50",
                      )}
                      size={"sm"}
                      onClick={() =>
                        setVisible(visible === "private" ? "public" : "private")
                      }
                    >
                      {visible === "private" ? (
                        <>
                          <IconLock className="h-3.5 w-3.5 mr-1" />
                          Private
                        </>
                      ) : (
                        <>
                          <IconLockOpen2 className="h-3.5 w-3.5 mr-1" />
                          Public
                        </>
                      )}
                    </Button>
                    <GlobalTaskRelease
                      task={draftTask}
                      editable
                      releases={releases}
                      onChange={(value) => setReleaseId(value)}
                      customTrigger={
                        <Button
                          variant={"primary"}
                          className="w-fit text-xs h-7"
                          size={"sm"}
                        >
                          {selectedRelease ? (
                            <>
                              {selectedRelease.icon ? (
                                <RenderIcon
                                  iconName={selectedRelease.icon}
                                  className="size-3.5! [&_svg]:size-3.5! mr-1"
                                  color={selectedRelease.color || undefined}
                                  button
                                />
                              ) : (
                                <IconRocket className="h-3.5 w-3.5 mr-1" />
                              )}
                              {selectedRelease.name}
                            </>
                          ) : (
                            <>
                              <IconRocket className="h-3.5 w-3.5 mr-1" />
                              Release
                            </>
                          )}
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>

              <AdaptiveDialogFooter className="mt-auto bg-background flex flex-col! gap-2 shrink-0">
                <div className="flex items-center gap-2 ml-auto">
                  {isEditMode ? (
                    <div className="flex items-center gap-1">
                      <Popover
                        open={confirmDeleteOpen}
                        onOpenChange={setConfirmDeleteOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 w-7 p-1 text-xs border-destructive/30 hover:border-destructive hover:bg-destructive/30"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-4 w-60 flex flex-col gap-3 bg-card border border-muted shadow-md">
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this template?
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDeleteOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDelete}
                            >
                              Delete
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {hasChanges && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleEdit}
                          disabled={isFetching || name.length === 0}
                        >
                          <IconDeviceFloppy className="h-4 w-4" />
                          Save
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleCreate}
                      disabled={isFetching || name.length === 0}
                    >
                      <IconPlus className="h-4 w-4" />
                      Create
                    </Button>
                  )}
                </div>
              </AdaptiveDialogFooter>
            </div>
          </motion.div>
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </>
  );
}
