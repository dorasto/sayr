import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { applyFilters } from "@/components/tasks/filter/filter-config";
import { useEffect, useMemo } from "react";
import { PublicTaskItem } from "./task-item";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";

export function PublicTaskView() {
  const { tasks, categories, ws, setTasks, organization, setLabels, setCategories } = usePublicOrganizationLayout();
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
      {filteredTasks.map((task) => (
        <PublicTaskItem key={task.id} task={task} categories={categories} />
      ))}
    </div>
  );
}
