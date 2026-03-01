import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconChecks, IconNotification } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import { useInbox } from "@/contexts/ContextInbox";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import { markAllNotificationsReadAction } from "@/lib/fetches/notification";
import { getTaskByIdForInbox } from "@/lib/serverFunctions/getTaskByIdForInbox";
import type { WSMessage } from "@/lib/ws";
import { MyTaskDetail } from "../mine/task-detail";
import { NotificationList } from "./notification-list";

export default function InboxPage() {
  const queryClient = useQueryClient();
  queryClient.removeQueries({ queryKey: ["organization"] });
  const { ws, account } = useLayoutData();
  const {
    tasks,
    setTasks,
    labels,
    setLabels,
    categories,
    setCategories,
    releases,
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    refreshNotifications,
  } = useInbox();

  const handleMarkAllRead = async () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    const result = await markAllNotificationsReadAction();
    if (!result.success) {
      refreshNotifications();
    }
  };
  const [selectedTask, setSelectedTask] =
    useState<schema.TaskWithLabels | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);
  useWebSocketSubscription({ ws });

  // Get unique organizations from tasks for filtering
  const organizations = useMemo(() => {
    return Array.from(
      new Map(
        tasks
          .filter((t) => t.organization)
          .map((t) => [t.organization!.id, t.organization!]),
      ).values(),
    );
  }, [tasks]);

  // Handle selecting a task from the notification list
  const handleNotificationSelectTask = useCallback(
    async (taskId: string, orgId: string, notificationId: string) => {
      // Toggle selection if clicking the same notification
      if (selectedNotificationId === notificationId) {
        setSelectedTask(null);
        setSelectedNotificationId(null);
        return;
      }
      setSelectedNotificationId(notificationId);
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        setSelectedTask(found);
        return;
      }
      // Task not in local list (e.g. user was mentioned but not assigned)
      // Fetch it from the server
      try {
        const result = await getTaskByIdForInbox({
          data: { accountId: account.id, orgId, taskId },
        });
        if (result.task) {
          setSelectedTask(result.task);
        }
      } catch {
        // Task may have been deleted or user lost access
      }
    },
    [tasks, selectedNotificationId, account.id],
  );

  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_TASK: (msg) => {
      const org = organizations.find((e) => e.id === msg.data.organizationId);

      const updatedTask: schema.TaskWithLabels = {
        ...msg.data,
        ...(org && {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo: org.logo,
          },
        }),
      };

      const isUserInList = updatedTask.assignees?.some(
        (user) => user.id === account.id,
      );

      const taskExists = tasks.some((task) => task.id === updatedTask.id);

      let newTasks: schema.TaskWithLabels[];

      if (isUserInList) {
        newTasks = taskExists
          ? tasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task,
            )
          : [...tasks, updatedTask];
      } else {
        newTasks = tasks.filter((task) => task.id !== updatedTask.id);
      }

      setTasks(newTasks);

      // Update the selected task with latest data (even if not assigned,
      // e.g. opened via a mention notification)
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      sendWindowMessage(
        window,
        {
          type: "timeline-update",
          payload: updatedTask.id,
        },
        "*",
      );
    },
    CREATE_TASK: (msg) => {
      if (msg.data.assignees.find((e: { id: string }) => e.id === account.id)) {
        setTasks([...tasks, msg.data]);
      }
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "INDIVIDUAL") {
        const newLabels = msg.data;
        if (!Array.isArray(newLabels)) return;

        const orgId = msg.meta?.orgId || newLabels[0]?.organizationId;
        if (!orgId) return;

        const updatedList = labels.filter(
          (label) => label.organizationId !== orgId,
        );
        const newList = [...updatedList, ...newLabels];
        setLabels(newList);
      }
    },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "INDIVIDUAL") {
        const newCategories = msg.data;
        if (!Array.isArray(newCategories)) return;

        const orgId = msg.meta?.orgId || newCategories[0]?.organizationId;
        if (!orgId) return;

        const updatedList = categories.filter(
          (cat) => cat.organizationId !== orgId,
        );
        const newList = [...updatedList, ...newCategories];
        setCategories(newList);
      }
    },
    UPDATE_TASK_COMMENTS: async (msg) => {
      if (msg.scope === "INDIVIDUAL" && msg.data.id === selectedTask?.id) {
        sendWindowMessage(
          window,
          {
            type: "timeline-update-comment",
            payload: msg.data.id,
          },
          "*",
        );
      }
    },
    UPDATE_TASK_VOTE: async (msg) => {
      if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId) {
        const { id, voteCount } = msg.data;
        const updatedTasks = tasks.map((task) =>
          task.id === id && task.organizationId === msg.meta?.orgId
            ? {
                ...task,
                voteCount,
              }
            : task,
        );
        setTasks(updatedTasks);
        if (selectedTask?.id === id) {
          setSelectedTask({
            ...selectedTask,
            voteCount,
          });
        }
        sendWindowMessage(
          window,
          {
            type: "update-votes",
            payload: msg.meta?.orgId,
          },
          "*",
        );
      }
    },
    NEW_NOTIFICATION: (_msg) => {
      // Refresh from server to get full notification details (actor, task, org relations)
      refreshNotifications();
    },
    NOTIFICATION_READ: (msg) => {
      if (msg.data.all) {
        // Mark all as read
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      } else if (msg.data.id) {
        // Mark single as read
        setNotifications(
          notifications.map((n) =>
            n.id === msg.data.id ? { ...n, read: true } : n,
          ),
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    },
  };

  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    // onUnhandled: (msg) => console.warn("[UNHANDLED MESSAGE InboxPage]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  const isMobile = useIsMobile();

  const leftPanelContent = (
    <div className="flex-1 overflow-hidden h-full min-h-0 flex flex-col">
      <NotificationList
        onSelectTask={handleNotificationSelectTask}
        selectedNotificationId={selectedNotificationId}
      />
    </div>
  );

  return (
    <div className="relative flex flex-col h-full max-h-full overflow-hidden">
      {isMobile ? (
        <>
          <PageHeader>
            <PageHeader.Identity
              icon={<IconNotification className="size-4" />}
              title="Inbox"
              actions={
                <>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleMarkAllRead}
                    >
                      <IconChecks className="size-3.5" />
                      Mark all read
                    </Button>
                  )}
                </>
              }
            />
          </PageHeader>
          {leftPanelContent}
        </>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left panel - Notification list */}
          <ResizablePanel defaultSize={25} minSize={10} maxSize={30}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 h-11 px-3 shrink-0 border-b">
                <IconNotification className="size-4 shrink-0" />
                <span className="text-xs font-medium truncate">Inbox</span>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleMarkAllRead}
                    >
                      <IconChecks className="size-3.5" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
              {leftPanelContent}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right panel - Task detail */}
          <ResizablePanel defaultSize={75}>
            <div
              className={cn(
                "flex-1 overflow-y-auto h-full flex flex-col relative",
              )}
            >
              {selectedTask ? (
                <MyTaskDetail
                  task={selectedTask}
                  tasks={tasks}
                  setTasks={setTasks}
                  setSelectedTask={setSelectedTask}
                  labels={labels}
                  categories={categories}
                  releases={releases}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground" />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
