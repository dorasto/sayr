import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { applyFilters } from "@/components/tasks/filter/filter-config";
import { useEffect, useMemo } from "react";
import { PublicTaskItem } from "./task-item";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? import.meta.env.VITE_EXTERNAL_API_URL : "/api";

export function PublicTaskView() {
  const { tasks, categories, ws, setTasks, organization, setLabels, setCategories } = usePublicOrganizationLayout();
  const { value: votes } = useStateManagementFetch<
    {
      success: boolean
      tasks: Array<{
        taskId: string
        voteCount: number
        count: number
      }>
    },
    Partial<{
      success: boolean
      tasks: Array<{
        taskId: string
        voteCount: number
        count: number
      }>
    }>
  >({
    key: ["votes", organization.id],
    fetch: {
      url: `${baseApiUrl}/admin/organization/task/voted?orgId=${organization.id}`,
      custom: async (url) => {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
        const data = await res.json();
        return data.data;
      },
    },
    staleTime: 1000,
    gcTime: 2000 * 60,
    refetchOnWindowFocus: false,
  });
  const { filters } = useTaskViewManager();

  const filteredTasks = useMemo(() => {
    return applyFilters(tasks, filters);
  }, [tasks, filters]);

  if (filteredTasks.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center border rounded-lg bg-card/50 border-dashed">
        No public tasks found matching your criteria.
      </div>
    );
  }
  const handlers: WSMessageHandler<WSMessage> = {
    CREATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setTasks([...tasks, msg.data]);
      }
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setLabels(msg.data);
      }
    },
    UPDATE_TASK_VOTE: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        const { id, voteCount } = msg.data;
        const updatedTasks = tasks.map((task) =>
          task.id === id
            ? {
              ...task,
              voteCount,
            }
            : task
        );
        setTasks(updatedTasks);
        votes.refetch();
      }
    },
    // UPDATE_VIEWS: (msg) => {
    //   if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
    //     setViews(msg.data);
    //   }
    // },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setCategories(msg.data);
      }
    },
    UPDATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        const updatedTask = msg.data;
        const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
        setTasks(updatedTasks);
      }
    },
  }
  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE PublicTaskView]", { msg }),
  });
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    // Cleanup on unmount or dependency change
    return () => {
      ws.removeEventListener("message", handleMessage);
    }
  }, [ws, handleMessage]);
  return (
    <div className="flex flex-col gap-2">
      {filteredTasks.map((task) => {
        const voted = !!votes.data?.tasks.find(
          (e) => e.taskId === task.id
        );
        return (
          <PublicTaskItem
            key={task.id}
            task={task}
            categories={categories}
            voted={voted}
          />
        );
      })}
    </div>
  );
}
