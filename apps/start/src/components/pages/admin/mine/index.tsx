import type { schema } from "@repo/database";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { cn } from "@repo/ui/lib/utils";
import { useState } from "react";
import { useMyTasks } from "@/contexts/ContextMine";
import { MyTasksList } from "./task-list";
import { MyTaskDetail } from "./task-detail";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";

export default function MyTasksPage() {
  const { tasks, setTasks, labels, categories } = useMyTasks();
  const [selectedTask, setSelectedTask] =
    useState<schema.TaskWithLabels | null>(null);

  // Get unique organizations from tasks for filtering
  const organizations = Array.from(
    new Map(
      tasks
        .filter((t) => t.organization)
        .map((t) => [t.organization!.id, t.organization!]),
    ).values(),
  );
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
