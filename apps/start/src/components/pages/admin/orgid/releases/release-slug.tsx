"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useStore } from "@tanstack/react-store";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import { ReleaseInfo } from "@/components/releases/ReleaseInfo";
import { ReleaseHeader } from "@/components/releases/ReleaseHeader";
import { ReleaseSidebar } from "@/components/releases/ReleaseSidebar";
import { UnifiedTaskView } from "@/components/tasks/views/unified-task-view";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import {
  LayoutReleaseProvider,
  useLayoutRelease,
} from "@/contexts/ContextOrgRelease";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  getReleaseWithTasksAction,
  updateReleaseAction,
} from "@/lib/fetches/release";
import {
  releaseChartsActions,
  releaseChartsStore,
} from "@/lib/stores/release-charts-store";
import { extractTextContent, useToastAction } from "@/lib/util";
import type { WSMessage } from "@/lib/ws";
import { Label } from "@repo/ui/components/label";
import Loader from "@/components/Loader";

interface ReleaseDetailPageProps {
  release: schema.releaseType;
}

function ReleaseDetailPageContent() {
  const { ws } = useLayoutData();
  const {
    organization,
    setOrganization,
    labels,
    categories,
    releases,
    setReleases,
  } = useLayoutOrganization();
  const { release, setRelease } = useLayoutRelease();

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
  const isChartsPanelOpen = useStore(
    releaseChartsStore,
    (state) => state.isOpen,
  );
  const chartsPanelRef = useRef<ResizablePanelHandle>(null);
  const useMobile = useIsMobile();
  const loadedReleaseIdRef = useRef<string | null>(null);

  // Memoize to prevent unnecessary re-renders of Editor
  const availableUsers = useMemo(
    () => organization?.members.map((member) => member.user) || [],
    [organization?.members],
  );

  // Handle panel collapse/expand
  useEffect(() => {
    if (useMobile) return;
    const panel = chartsPanelRef.current;
    if (panel) {
      if (isChartsPanelOpen) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  }, [isChartsPanelOpen, useMobile]);

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
      if (!release?.id) return;

      // Avoid reloading if we've already loaded this release
      if (loadedReleaseIdRef.current === release.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getReleaseWithTasksAction(
          organization.id,
          release.id,
        );
        if (result.success && result.data) {
          setRelease(result.data);
          setTasks(result.data.tasks);
          const desc = result.data.description as NodeJSON | undefined;
          setDescription(desc);
          setSavedDescription(desc);
          loadedReleaseIdRef.current = release.id;
        }
      } catch (error) {
        console.error("Failed to load release:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadRelease();
  }, [release?.id, organization.id, setRelease]);

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
    // onUnhandled: (msg) =>
    //     console.warn("⚠️ [UNHANDLED MESSAGE ReleaseDetailPage]", msg),
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
    [release, organization.id, wsClientId, runWithToast, setRelease],
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
              ? `Target date set to ${date.toLocaleDateString()}.`
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
    [release, organization.id, wsClientId, runWithToast, setRelease],
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
              ? `Release date set to ${date.toLocaleDateString()}.`
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
    [release, organization.id, wsClientId, runWithToast, setRelease],
  );

  // Handle name and slug update from header
  const handleNameSlugUpdate = useCallback(
    async (data: { name: string; slug: string }) => {
      if (!release) return;

      const result = await runWithToast(
        "update-release-name-slug",
        {
          loading: {
            title: "Saving...",
            description: "Updating release name and slug.",
          },
          success: {
            title: "Saved",
            description: "Release updated successfully.",
          },
          error: {
            title: "Failed",
            description: "Could not update release.",
          },
        },
        () =>
          updateReleaseAction(organization.id, release.id, data, wsClientId),
      );

      if (result?.success && result.data) {
        setRelease((prev) =>
          prev
            ? {
                ...prev,
                name: result.data.name,
                slug: result.data.slug,
              }
            : null,
        );
      }
    },
    [release, organization.id, wsClientId, runWithToast, setRelease],
  );

  // Handle header update (includes icon and color)
  const handleHeaderUpdate = useCallback(
    async (data: {
      name: string;
      slug: string;
      icon: string;
      color: string;
    }) => {
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
          updateReleaseAction(organization.id, release.id, data, wsClientId),
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
      }
    },
    [release, organization.id, wsClientId, runWithToast, setRelease],
  );

  // Calculate task statistics for the release
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === "done" || t.status === "canceled",
    ).length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      inProgress,
      todo,
      backlog,
      completionPercentage,
    };
  }, [tasks]);

  // Calculate days until/since target date
  const daysUntilTarget = useMemo(() => {
    if (!release?.targetDate) return null;
    const now = new Date();
    const target = new Date(release.targetDate);
    const diff = Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  }, [release?.targetDate]);

  if (loading || !release) {
    return <Loader />;
  }

  return (
    <div className="relative flex flex-col h-full max-h-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={useMobile ? 100 : 70} minSize={50}>
          <div className="h-full overflow-y-auto flex flex-col gap-3">
            {/* Header Section */}
            <div className="flex flex-col gap-3 p-3">
              <ReleaseHeader
                release={release}
                onStatusUpdate={handleStatusUpdate}
                onTargetDateUpdate={handleTargetDateUpdate}
                onReleasedAtUpdate={handleReleasedAtUpdate}
                onUpdate={handleNameSlugUpdate}
              />

              {/* Description Section */}
              <div className="flex flex-col gap-3">
                <div className="w-full min-w-full">
                  <Editor
                    defaultContent={release?.description || undefined}
                    onChange={setDescription}
                    placeholder="Add a description for this release..."
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
            </div>
            {/* Tasks Section */}
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
            {/*<div className="bg-card rounded-lg p-3 flex flex-col gap-3">
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
            </div>*/}
          </div>
        </ResizablePanel>

        {useMobile ? (
          <Sheet
            defaultOpen={false}
            open={isChartsPanelOpen}
            onOpenChange={releaseChartsActions.close}
          >
            <SheetContent className="p-0" showClose={false}>
              <SheetHeader className="sr-only">
                <SheetTitle>Charts and Statistics</SheetTitle>
                <SheetDescription>
                  View charts and statistics for this release
                </SheetDescription>
              </SheetHeader>
              <div className="h-full overflow-y-auto flex flex-col gap-3 p-3">
                <ReleaseInfo
                  release={release}
                  onUpdate={handleHeaderUpdate}
                  onStatusUpdate={handleStatusUpdate}
                  onTargetDateUpdate={handleTargetDateUpdate}
                />
                <ReleaseSidebar
                  tasks={tasks}
                  taskStats={taskStats}
                  daysUntilTarget={daysUntilTarget}
                  organizationId={organization.id}
                  releaseId={release.id}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={isChartsPanelOpen ? 30 : 0}
              minSize={20}
              collapsedSize={0}
              collapsible={true}
              ref={chartsPanelRef}
              onCollapse={() => releaseChartsActions.close()}
              onExpand={() => releaseChartsActions.open()}
            >
              <div className="h-full overflow-y-auto flex flex-col gap-3 p-3">
                <Label>Information</Label>
                <ReleaseInfo
                  release={release}
                  onUpdate={handleHeaderUpdate}
                  onStatusUpdate={handleStatusUpdate}
                  onTargetDateUpdate={handleTargetDateUpdate}
                />
                <Label>Status</Label>
                <ReleaseSidebar
                  tasks={tasks}
                  taskStats={taskStats}
                  daysUntilTarget={daysUntilTarget}
                  organizationId={organization.id}
                  releaseId={release.id}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

export default function ReleaseDetailPage({
  release: initialRelease,
}: ReleaseDetailPageProps) {
  const [release, setRelease] = useState<schema.ReleaseWithTasks | null>(
    () => ({ ...initialRelease, tasks: [], createdBy: null }) as any,
  );

  // Update release when initialRelease changes
  useEffect(() => {
    setRelease({ ...initialRelease, tasks: [], createdBy: null } as any);
  }, [initialRelease]);

  return (
    <LayoutReleaseProvider initialRelease={release}>
      <ReleaseDetailPageContent />
    </LayoutReleaseProvider>
  );
}
