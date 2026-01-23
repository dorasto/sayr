"use client";
import { Button } from "@repo/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import { Separator } from "@repo/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { TaskFilterDropdown } from "@/components/tasks/filter";
import ProjectSide from "@/components/tasks/side";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { TaskViewDropdown, UnifiedTaskView } from "@/components/tasks/views";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";

export default function OrganizationTasksHomePage() {
  const { ws } = useLayoutData();
  const {
    organization,
    setOrganization,
    labels,
    setLabels,
    views,
    setViews,
    categories,
    setCategories,
    isProjectPanelOpen,
    setProjectPanelOpen,
  } = useLayoutOrganization();
  const { viewMode } = useTaskViewManager(views);
  const { tasks, setTasks } = useLayoutTasks();
  const ref = useRef<ResizablePanelHandle>(null);
  const useMobile = useIsMobile();

  useEffect(() => {
    if (useMobile) {
      setProjectPanelOpen(false);
    }
  }, [useMobile, setProjectPanelOpen]);

  useEffect(() => {
    if (useMobile) return;
    const panel = ref.current;
    if (panel) {
      if (isProjectPanelOpen) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  }, [isProjectPanelOpen, useMobile]);

  useWebSocketSubscription({
    ws,
    orgId: organization.id,
    organization: organization,
    channel: `tasks`,
    setOrganization: setOrganization,
  });
  const handlers: WSMessageHandler<WSMessage> = {
    CREATE_TASK: (msg) => {
      setTasks([...tasks, msg.data]);
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
        setLabels(msg.data);
      }
    },
    UPDATE_VIEWS: (msg) => {
      if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
        setViews(msg.data);
      }
    },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
        setCategories(msg.data);
      }
    },
  };
  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE PROJECT PAGE]", msg),
  });
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    // Cleanup on unmount or dependency change
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  const availableUsers =
    organization?.members.map((member) => member.user) || [];
  return (
    <div className="relative flex flex-col h-full max-h-full">
      {/* <div className="flex items-center gap-3 bg-card rounded p-3 w-full">
                <Label variant={"heading"} className="truncate w-auto">
                    {project.name}
                </Label>
            </div> */}
      <div className="sticky top-0 z-20 bg-background flex items-center flex-wrap gap-1 p-1 md:gap-2 md:p-2">
        <TaskFilterDropdown
          tasks={tasks}
          labels={labels}
          availableUsers={availableUsers}
          organizationId={organization.id}
          views={views}
          setViews={setViews}
          categories={categories}
        />
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Separator orientation="vertical" className="h-5" />
          <TaskViewDropdown />
          <Button
            variant="accent"
            className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1")}
            onClick={() =>
              isProjectPanelOpen
                ? setProjectPanelOpen(false)
                : setProjectPanelOpen(true)
            }
          >
            {isProjectPanelOpen ? (
              <IconLayoutSidebarRightFilled />
            ) : (
              <IconLayoutSidebarRight />
            )}
          </Button>
        </div>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className={cn(viewMode === "kanban" && "")}
      >
        <ResizablePanel
          defaultSize={useMobile ? 100 : 70}
          minSize={70}
          className={cn(viewMode === "list" && "")}
        >
          <div
            className={cn(
              "flex-1 overflow-y-auto h-full flex flex-col relative",
              viewMode === "kanban" && "px-0",
            )}
          >
            <UnifiedTaskView
              tasks={tasks}
              setTasks={setTasks}
              ws={ws}
              labels={labels}
              availableUsers={availableUsers}
              organization={organization}
              categories={categories}
            />
          </div>
        </ResizablePanel>
        {useMobile ? (
          <Sheet
            defaultOpen={false}
            open={isProjectPanelOpen}
            onOpenChange={setProjectPanelOpen}
          >
            <SheetContent className="p-0" showClose={false}>
              <SheetHeader className="sr-only">
                <SheetTitle>Are you absolutely sure?</SheetTitle>
                <SheetDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto h-full flex flex-col relative p-3">
                <ProjectSide />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={isProjectPanelOpen ? 30 : 0}
              minSize={20}
              collapsedSize={0}
              collapsible={true}
              ref={ref}
              onCollapse={() => setProjectPanelOpen(false)}
              onExpand={() => setProjectPanelOpen(true)}
            >
              <div className="flex-1 overflow-y-auto h-full flex flex-col relative px-2">
                <ProjectSide />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
