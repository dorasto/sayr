import type { schema } from "@repo/database";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { cn } from "@repo/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useMyTasks } from "@/contexts/ContextMine";
import { MyTasksList } from "./task-list";
import { MyTaskDetail } from "./task-detail";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutData } from "@/components/generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";
import { onWindowMessage, sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  queryClient.removeQueries({ queryKey: ["organization"] });
  const { ws, account } = useLayoutData();
  const { tasks, setTasks, labels, setLabels, categories, setCategories } = useMyTasks();
  const [selectedTask, setSelectedTask] =
    useState<schema.TaskWithLabels | null>(null);
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

  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_TASK: (msg) => {
      const org = organizations.find(
        (e) => e.id === msg.data.organizationId,
      );

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

      const taskExists = tasks.some(
        (task) => task.id === updatedTask.id,
      );

      let newTasks: schema.TaskWithLabels[];

      if (isUserInList) {
        newTasks = taskExists
          ? tasks.map((task) =>
            task.id === updatedTask.id ? updatedTask : task,
          )
          : [...tasks, updatedTask];
      } else {
        newTasks = tasks.filter(
          (task) => task.id !== updatedTask.id,
        );
        if (selectedTask?.id === updatedTask.id) setSelectedTask(null);
      }

      setTasks(newTasks);

      // ✅ keep selectedTask in sync
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
      if (msg.data.assignees.find((e) => e.id === account.id)) {
        setTasks([...tasks, msg.data]);
      }
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "INDIVIDUAL") {
        const newLabels = msg.data;
        if (!Array.isArray(newLabels)) return;

        // Try to get orgId from meta first, fallback to first category item
        const orgId = msg.meta?.orgId || newLabels[0]?.organizationId;
        if (!orgId) return; // nothing to update if we can't determine org

        // remove existing categories for this org
        const updatedList = labels.filter((label) => label.organizationId !== orgId);

        // add the new ones for this org
        const newList = [...updatedList, ...newLabels];

        setLabels(newList);
      }
    },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "INDIVIDUAL") {
        const newCategories = msg.data;
        if (!Array.isArray(newCategories)) return;

        // Try to get orgId from meta first, fallback to first category item
        const orgId = msg.meta?.orgId || newCategories[0]?.organizationId;
        if (!orgId) return; // nothing to update if we can't determine org

        // remove existing categories for this org
        const updatedList = categories.filter((cat) => cat.organizationId !== orgId);

        // add the new ones for this org
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
          "*"
        )
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
          "*"
        )
      }
    }
  };

  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE MyTasksPage]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  const isMobile = useIsMobile();
  return (
    <div className="relative flex flex-col h-full max-h-full">
      {isMobile ? (
        <MyTasksList
          tasks={tasks}
          setTasks={setTasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          organizations={organizations}
          labels={labels}
          categories={categories}
        />
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left panel - Task list with filters */}
          <ResizablePanel
            defaultSize={25}
            minSize={10}
            maxSize={30}
            className=""
          >
            <div className="flex-1 overflow-hidden h-full flex flex-col">
              <MyTasksList
                tasks={tasks}
                setTasks={setTasks}
                selectedTask={selectedTask}
                setSelectedTask={setSelectedTask}
                organizations={organizations}
                labels={labels}
                categories={categories}
              />
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
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground"></div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
