"use client";

import { useLayoutData } from "@/components/generic/Context";
import { UnifiedTaskView } from "@/components/tasks/views/unified-task-view";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  getReleaseWithTasksAction,
  updateReleaseAction,
} from "@/lib/fetches/release";
import { extractTextContent, useToastAction } from "@/lib/util";
import type { WSMessage } from "@/lib/ws";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Badge } from "@repo/ui/components/badge";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconCheck,
  IconRocket,
  IconCalendarEvent,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@repo/util";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import type { NodeJSON } from "prosekit/core";
import { SubWrapper } from "@/components/generic/wrapper";
import RenderIcon from "@/components/generic/RenderIcon";
import { extractHslValues } from "@repo/util";
import { Separator } from "@repo/ui/components/separator";
import { Label } from "@repo/ui/components/label";
import { Calendar } from "@repo/ui/components/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  AdaptiveDialog,
  AdaptiveDialogTrigger,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogFooter,
  AdaptiveDialogTitle,
  AdaptiveDialogBody,
} from "@repo/ui/components/adaptive-dialog";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import IconPicker from "@/components/generic/icon-picker";
import { IconPencil } from "@tabler/icons-react";
import {
  releaseStatusConfig,
  RELEASE_STATUS_ORDER,
} from "@/components/releases/config";

interface ReleaseDetailPageProps {
  release: schema.releaseType;
}

export default function ReleaseDetailPage({
  release: initialRelease,
}: ReleaseDetailPageProps) {
  const { ws } = useLayoutData();
  const router = useRouter();
  const {
    organization,
    setOrganization,
    labels,
    categories,
    releases,
    setReleases,
  } = useLayoutOrganization();

  const [release, setRelease] = useState<schema.ReleaseWithTasks | null>(null);
  const [tasks, setTasks] = useState<schema.TaskWithLabels[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState<NodeJSON | undefined>(
    release?.description || undefined,
  );
  const [savedDescription, setSavedDescription] = useState<
    NodeJSON | undefined
  >(undefined);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const { runWithToast } = useToastAction();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

  // Edit mode state for title/slug/icon
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editName, setEditName] = useState(release?.name || "");
  const [editSlug, setEditSlug] = useState(release?.slug || "");
  const [editIcon, setEditIcon] = useState(release?.icon || "IconRocket");
  const [editColor, setEditColor] = useState({
    hsla: release?.color || "#3B82F6",
    hex: release?.color || "#3B82F6",
  });

  // Memoize to prevent unnecessary re-renders of Editor
  const availableUsers = useMemo(
    () => organization?.members.map((member) => member.user) || [],
    [organization?.members],
  );

  useWebSocketSubscription({
    ws,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });

  // Load release with tasks
  useEffect(() => {
    const loadRelease = async () => {
      try {
        setLoading(true);
        const result = await getReleaseWithTasksAction(
          organization.id,
          initialRelease.id,
        );
        if (result.success && result.data) {
          setRelease(result.data);
          setTasks(result.data.tasks);
          const desc = result.data.description as NodeJSON | undefined;
          setDescription(desc);
          setSavedDescription(desc);
          // Sync edit values
          setEditName(result.data.name);
          setEditSlug(result.data.slug);
          setEditIcon(result.data.icon || "IconRocket");
          setEditColor({
            hsla: result.data.color || "#3B82F6",
            hex: result.data.color || "#3B82F6",
          });
        }
      } catch (error) {
        console.error("Failed to load release:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadRelease();
  }, [initialRelease.id, organization.id]);

  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_RELEASES: (msg) => {
      if (msg.scope === "CHANNEL" && "data" in msg) {
        setReleases(msg.data);
        // Update current release if it's in the updated list
        const updatedRelease = (msg.data as schema.releaseType[]).find(
          (r) => r.id === release?.id,
        );
        if (updatedRelease && release) {
          // Preserve tasks array and createdBy when updating release metadata
          setRelease({
            ...release,
            ...updatedRelease,
            tasks: release.tasks,
            createdBy: release.createdBy,
          } as schema.ReleaseWithTasks);
        }
      }
    },
    DELETE_RELEASE: (msg) => {
      if (msg.scope === "CHANNEL" && "data" in msg && msg.data?.releaseId) {
        setReleases(
          releases.filter(
            (r: schema.releaseType) => r.id !== msg.data.releaseId,
          ),
        );
        // If current release was deleted, redirect
        if (msg.data.releaseId === release?.id) {
          void router.navigate({ to: `/${organization.id}/releases` });
        }
      }
    },
    UPDATE_TASK: (msg) => {
      if (msg.scope === "CHANNEL" && "data" in msg) {
        const task = msg.data as schema.TaskWithLabels;
        // If task belongs to this release, update it
        if (task.releaseId === release?.id) {
          setTasks((prevTasks) => {
            const existingIndex = prevTasks.findIndex((t) => t.id === task.id);
            if (existingIndex >= 0) {
              const newTasks = [...prevTasks];
              newTasks[existingIndex] = task;
              return newTasks;
            }
            return [...prevTasks, task];
          });
        } else {
          // Task was removed from this release
          setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id));
        }
      }
    },
  };

  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE ReleaseDetailPage]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  const handleDescriptionSave = useCallback(
    async (content: NodeJSON | undefined) => {
      if (!release || !content) return;

      try {
        setIsSavingDescription(true);
        const processedContent = await processUploads(
          content,
          "public",
          organization.id,
          "update-release-description",
        );

        const result = await runWithToast(
          "update-release-description",
          {
            loading: {
              title: "Saving...",
              description: "Updating release description.",
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
            updateReleaseAction(
              organization.id,
              release.id,
              { description: processedContent },
              wsClientId,
            ),
        );

        if (result?.success) {
          setDescription(processedContent);
          setSavedDescription(processedContent);
        }
      } finally {
        setIsSavingDescription(false);
      }
    },
    [release, organization.id, wsClientId, runWithToast],
  );

  // Check if description has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const currentText = extractTextContent(description);
    const savedText = extractTextContent(savedDescription);

    return currentText !== savedText;
  }, [description, savedDescription]);

  // Check if header has unsaved changes
  const hasHeaderChanges = useMemo(() => {
    if (!release) return false;
    return (
      editName !== release.name ||
      editSlug !== release.slug ||
      editIcon !== release.icon ||
      editColor.hsla !== release.color
    );
  }, [editName, editSlug, editIcon, editColor, release]);

  // Handle header update
  const handleHeaderUpdate = useCallback(async () => {
    if (!release) return;

    const result = await runWithToast(
      "update-release-header",
      {
        loading: {
          title: "Saving...",
          description: "Updating release information.",
        },
        success: {
          title: "Saved",
          description: "Release information updated successfully.",
        },
        error: {
          title: "Failed",
          description: "Could not update release information.",
        },
      },
      () =>
        updateReleaseAction(
          organization.id,
          release.id,
          {
            name: editName,
            slug: editSlug,
            icon: editIcon,
            color: editColor.hsla,
          },
          wsClientId,
        ),
    );

    if (result?.success && result.data) {
      // Only update the fields that were changed, preserve tasks and createdBy
      setRelease((prev) =>
        prev
          ? {
              ...prev,
              name: result.data.name,
              slug: result.data.slug,
              icon: result.data.icon,
              color: result.data.color,
            }
          : null,
      );
      setIsEditingHeader(false);
    }
  }, [
    release,
    editName,
    editSlug,
    editIcon,
    editColor,
    organization.id,
    wsClientId,
    runWithToast,
  ]);

  // Handle status update
  const handleStatusUpdate = useCallback(
    async (newStatus: schema.releaseType["status"]) => {
      if (!release || newStatus === release.status) return;

      // Auto-set releasedAt when marking as released
      const updates: any = { status: newStatus };
      if (newStatus === "released" && !release.releasedAt) {
        updates.releasedAt = new Date();
      }

      const result = await runWithToast(
        "update-release-status",
        {
          loading: {
            title: "Updating status...",
            description: "Changing release status.",
          },
          success: {
            title: "Status updated",
            description: `Release status changed to ${newStatus}.`,
          },
          error: {
            title: "Failed",
            description: "Could not update release status.",
          },
        },
        () =>
          updateReleaseAction(organization.id, release.id, updates, wsClientId),
      );

      if (result?.success && result.data) {
        setRelease((prev) =>
          prev
            ? {
                ...prev,
                status: result.data.status,
                releasedAt: result.data.releasedAt,
              }
            : null,
        );
      }
    },
    [release, organization.id, wsClientId, runWithToast],
  );

  // Handle target date update
  const handleTargetDateUpdate = useCallback(
    async (date: Date | null) => {
      if (!release) return;

      const result = await runWithToast(
        "update-release-target-date",
        {
          loading: {
            title: "Updating target date...",
            description: date
              ? "Setting target date."
              : "Clearing target date.",
          },
          success: {
            title: date ? "Target date set" : "Target date cleared",
            description: date
              ? `Target date set to ${formatDate(date)}.`
              : "Target date has been cleared.",
          },
          error: {
            title: "Failed",
            description: "Could not update target date.",
          },
        },
        () =>
          updateReleaseAction(
            organization.id,
            release.id,
            { targetDate: date },
            wsClientId,
          ),
      );

      if (result?.success && result.data) {
        setRelease((prev) =>
          prev
            ? {
                ...prev,
                targetDate: result.data.targetDate,
              }
            : null,
        );
      }
    },
    [release, organization.id, wsClientId, runWithToast],
  );

  // Handle released date update (admin only)
  const handleReleasedAtUpdate = useCallback(
    async (date: Date | null) => {
      if (!release) return;

      const result = await runWithToast(
        "update-release-released-date",
        {
          loading: {
            title: "Updating release date...",
            description: date
              ? "Setting release date."
              : "Clearing release date.",
          },
          success: {
            title: date ? "Release date set" : "Release date cleared",
            description: date
              ? `Release date set to ${formatDate(date)}.`
              : "Release date has been cleared.",
          },
          error: {
            title: "Failed",
            description: "Could not update release date.",
          },
        },
        () =>
          updateReleaseAction(
            organization.id,
            release.id,
            { releasedAt: date },
            wsClientId,
          ),
      );

      if (result?.success && result.data) {
        setRelease((prev) =>
          prev
            ? {
                ...prev,
                releasedAt: result.data.releasedAt,
              }
            : null,
        );
      }
    },
    [release, organization.id, wsClientId, runWithToast],
  );

  if (loading || !release) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading release details...</p>
        </div>
      </div>
    );
  }

  return (
    <SubWrapper
      title={release.name}
      description={release.slug}
      iconClassName="p-0 bg-transparent"
      style="compact"
      backButton=".."
      icon={
        <div
          className="p-1 rounded-lg"
          style={{
            background: release.color
              ? `hsla(${extractHslValues(release.color)}, 0.2)`
              : undefined,
          }}
        >
          <RenderIcon
            iconName={release.icon || "IconRocket"}
            size={12}
            color={release.color || undefined}
            raw
          />
        </div>
      }
      topContent={
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                className={cn(
                  "border rounded-lg cursor-pointer gap-1.5",
                  releaseStatusConfig[release.status].badgeClassName,
                )}
              >
                {releaseStatusConfig[release.status].icon("w-3 h-3")}
                {releaseStatusConfig[release.status].label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {RELEASE_STATUS_ORDER.map((status) => {
                const config = releaseStatusConfig[status];
                return (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {config.icon("w-4 h-4")}
                      <span>{config.label}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Target Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 gap-1.5 text-xs",
                  release.targetDate
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <IconCalendarEvent className="w-3 h-3" />
                {release.targetDate
                  ? formatDate(release.targetDate)
                  : "Target date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  release.targetDate ? new Date(release.targetDate) : undefined
                }
                onSelect={(date) => handleTargetDateUpdate(date || null)}
              />
              {release.targetDate && (
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => handleTargetDateUpdate(null)}
                  >
                    <IconX className="w-3 h-3 mr-1" />
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Released Date */}
          {release.releasedAt && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-xs text-green-600"
                >
                  <IconCheck className="w-3 h-3" />
                  Released: {formatDate(release.releasedAt)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    release.releasedAt
                      ? new Date(release.releasedAt)
                      : undefined
                  }
                  onSelect={(date) => handleReleasedAtUpdate(date || null)}
                />
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => handleReleasedAtUpdate(null)}
                  >
                    <IconX className="w-3 h-3 mr-1" />
                    Clear date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Edit Button */}
          <AdaptiveDialog
            open={isEditingHeader}
            onOpenChange={setIsEditingHeader}
          >
            <AdaptiveDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 px-2 text-xs gap-1"
              >
                <IconPencil className="w-3 h-3" />
              </Button>
            </AdaptiveDialogTrigger>
            <AdaptiveDialogContent size="medium">
              <AdaptiveDialogHeader>
                <AdaptiveDialogTitle asChild>
                  <Label>Edit release</Label>
                </AdaptiveDialogTitle>
              </AdaptiveDialogHeader>

              <AdaptiveDialogBody className="p-3 pt-0">
                <InputGroup className="h-auto bg-accent border-transparent rounded-lg pr-1">
                  <InputGroupAddon align="inline-start" className="h-full">
                    <InputGroupButton asChild>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"ghost"}
                            className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
                          >
                            <RenderIcon
                              iconName={editIcon}
                              color={editColor.hsla}
                              button
                              className="size-8 [&_svg]:size-5"
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-64 md:w-96">
                          <div className="flex flex-col gap-3">
                            <div className="p-3">
                              <ColorPickerCustom
                                onChange={setEditColor}
                                defaultValue={editColor.hex}
                                height={100}
                              />
                            </div>
                            <div className="px-3">
                              <IconPicker
                                value={editIcon}
                                update={(value: string): void => {
                                  setEditIcon(value);
                                }}
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </InputGroupButton>
                  </InputGroupAddon>

                  <InputGroupInput
                    className="h-8 text-base font-semibold border-0"
                    placeholder="Release name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />

                  <InputGroupInput
                    className="w-40 h-8 text-sm text-muted-foreground border-0"
                    placeholder="Slug"
                    value={editSlug}
                    onChange={(e) =>
                      setEditSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-_.]/g, ""),
                      )
                    }
                  />
                </InputGroup>
              </AdaptiveDialogBody>

              <AdaptiveDialogFooter>
                <Button
                  variant="primary"
                  size={"sm"}
                  onClick={() => {
                    setIsEditingHeader(false);
                    // Reset values
                    setEditName(release.name);
                    setEditSlug(release.slug);
                    setEditIcon(release.icon || "IconRocket");
                    setEditColor({
                      hsla: release.color || "#3B82F6",
                      hex: release.color || "#3B82F6",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size={"sm"}
                  onClick={async () => {
                    await handleHeaderUpdate();
                  }}
                  disabled={!hasHeaderChanges}
                >
                  Update
                </Button>
              </AdaptiveDialogFooter>
            </AdaptiveDialogContent>
          </AdaptiveDialog>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="bg-card rounded-lg p-3 flex flex-col gap-3">
          {/* Task Stats */}
          {/*{taskStats.total > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Done: {taskStats.done}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>In Progress: {taskStats.inProgress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>To Do: {taskStats.todo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span>Backlog: {taskStats.backlog}</span>
                </div>
              </div>
            )}*/}

          {/* Description Section */}

          <div className="w-full min-w-full">
            <Editor
              defaultContent={release?.description || undefined}
              onChange={setDescription}
              placeholder="Add a description for this release..."
              users={availableUsers}
              categories={categories}
              tasks={tasks}
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
          <Separator />
          {/* Tasks */}
          <Label variant={"heading"}>Tasks</Label>
          <div className="flex-1 overflow-hidden bg-card rounded-lg p-1">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <IconRocket className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                <p className="text-sm text-muted-foreground">
                  Tasks assigned to this release will appear here.
                </p>
              </div>
            ) : (
              <UnifiedTaskView
                tasks={tasks}
                setTasks={setTasks}
                ws={ws}
                labels={labels}
                availableUsers={availableUsers}
                organization={organization}
                categories={categories}
                releases={releases}
                compact={true}
                forceShowCompleted={true}
              />
            )}
          </div>
        </div>
      </div>
    </SubWrapper>
  );
}
