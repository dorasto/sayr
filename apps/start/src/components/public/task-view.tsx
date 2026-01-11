import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { applyFilters } from "@/components/tasks/filter/filter-config";
import { useMemo } from "react";
import { PublicTaskItem } from "./task-item";

export function PublicTaskView() {
  const { tasks, categories } = usePublicOrganizationLayout();
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

  return (
    <div className="flex flex-col gap-2">
      {filteredTasks.map((task) => (
        <PublicTaskItem key={task.id} task={task} categories={categories} />
      ))}
    </div>
  );
}
