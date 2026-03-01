import type { schema } from "@repo/database";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
// @ts-ignore
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import type { TaskDetailOrganization } from "../types";
import { TaskDetailCompact } from "./task-detail-compact";

// Collapsed matches the creator dialog's expanded size.
// Expanded grows larger for more room.
const DIALOG_SIZES = {
  collapsed: {
    width: "min(50rem, calc(100vw - 2rem))",
    height: "min(40rem, calc(100vh - 6rem))",
    minHeight: "18rem",
    maxHeight: "min(40rem, calc(100vh - 6rem))",
  },
  expanded: {
    width: "min(70rem, calc(100vw - 2rem))",
    height: "min(55rem, calc(100vh - 4rem))",
    minHeight: "min(55rem, calc(100vh - 4rem))",
    maxHeight: "min(55rem, calc(100vh - 4rem))",
  },
  transition: {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.25,
  },
} as const;

interface TaskDetailDialogProps {
  task: schema.TaskWithLabels | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  labels: schema.labelType[];
  categories: schema.categoryType[];
  releases?: schema.releaseType[];
  /** Organization context for richer display (clipboard slug, member list, etc.) */
  organization?: TaskDetailOrganization;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  tasks,
  setTasks,
  labels,
  categories,
  releases = [],
  organization,
}: TaskDetailDialogProps) {
  const isMobile = useIsMobile();
  const [expand, setExpand] = useState(false);

  const handleSetSelectedTask = useCallback(
    (t: schema.TaskWithLabels | null) => {
      if (!t) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  if (!task) return null;

  return (
    <AdaptiveDialog open={open} onOpenChange={onOpenChange}>
      <AdaptiveDialogContent
        className={cn(
          "z-50 border",
          !isMobile && "md:max-w-none! md:w-auto! md:h-auto!",
          !isMobile && "translate-y-0!",
        )}
        style={
          !isMobile
            ? {
                top: expand ? "5%" : "15%",
                transition: "top 0.25s ease-in-out",
              }
            : undefined
        }
        childClassName={cn(
          !isMobile && "flex flex-col min-h-0 overflow-hidden",
        )}
        showClose={false}
      >
        {/* Visually hidden but required for accessibility */}
        <AdaptiveDialogTitle className="sr-only">
          {task.title}
        </AdaptiveDialogTitle>
        <AdaptiveDialogDescription className="sr-only">
          Task #{task.shortId} details
        </AdaptiveDialogDescription>

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
                : DIALOG_SIZES.collapsed.height
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
          <TaskDetailCompact
            task={task}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={handleSetSelectedTask}
            labels={labels}
            categories={categories}
            releases={releases}
            organization={organization}
            toolbarExtra={
              !isMobile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setExpand(!expand)}
                >
                  {expand ? (
                    <IconArrowsDiagonalMinimize2 className="size-4" />
                  ) : (
                    <IconArrowsDiagonal className="size-4" />
                  )}
                </Button>
              ) : undefined
            }
          />
        </motion.div>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
}
