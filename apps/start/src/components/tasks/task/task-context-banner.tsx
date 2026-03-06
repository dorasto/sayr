import { useMemo, useState, useEffect, useCallback } from "react";
import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArrowUpRight,
  IconChevronRight,
  IconCopy,
  IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import GlobalTaskStatus from "../shared/status";
import { statusConfig } from "../shared/config";
import { SubtaskProgressBadge } from "../shared/subtask-progress";
import { getTaskRelationsAction } from "@/lib/fetches/task";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { Label } from "@repo/ui/components/label";

interface TaskContextBannerProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
}

/**
 * Renders a single task row with an editable status icon (when full task data
 * is available in the tasks array) or a static status icon as fallback.
 */
function RelationTaskRow({
  taskData,
  orgId,
  tasks,
  setTasks,
  setSelectedTask,
}: {
  taskData: {
    id: string;
    shortId: number | null;
    title: string | null;
    status: string;
  };
  orgId: string;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
}) {
  const fullTask = useMemo(
    () => tasks.find((t) => t.id === taskData.id),
    [tasks, taskData.id],
  );
  const status = statusConfig[taskData.status as keyof typeof statusConfig];

  return (
    <div className="flex items-center gap-1.5 py-1 group text-sm w-fit p-1 rounded-lg bg-card hover:bg-accent transition-all">
      {fullTask ? (
        <GlobalTaskStatus
          task={fullTask}
          editable={true}
          useInternalLogic={true}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          customTrigger={
            <button
              type="button"
              className="size-4 grid place-items-center shrink-0 cursor-pointer"
            >
              {status?.icon(cn("h-3.5 w-3.5", status?.className))}
            </button>
          }
        />
      ) : (
        <span className="size-4 grid place-items-center shrink-0">
          {status?.icon(cn("h-3.5 w-3.5", status?.className))}
        </span>
      )}
      <Link
        to="/$orgId/tasks/$taskShortId"
        params={{ orgId, taskShortId: String(taskData.shortId) }}
        className="flex items-center gap-1.5 min-w-0"
      >
        <span className="truncate">{taskData.title}</span>
        <span className="text-muted-foreground shrink-0">
          #{taskData.shortId}
        </span>
      </Link>
    </div>
  );
}

/**
 * Section wrapper with a collapsible trigger.
 */
function ContextSection({
	label,
	icon,
	trailing,
	children,
}: {
	label: string;
	icon?: React.ReactNode;
	/** Content rendered inline after the label (e.g. progress badge) */
	trailing?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Collapsible defaultOpen>
			<div className="flex items-center gap-1">
				<CollapsibleTrigger asChild>
					<div className="flex items-center gap-1 group cursor-pointer">
						<IconChevronRight className="size-4 text-muted-foreground group-data-[state=open]:rotate-90 transition-all" />
						{icon}
						<Label variant={"description"} className="text-xs select-none">
							{label}
						</Label>
					</div>
				</CollapsibleTrigger>
				{trailing}
			</div>
			<CollapsibleContent className="py-1">
				<div className="flex flex-col gap-0.5">{children}</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function TaskContextBanner({
  task,
  tasks,
  setTasks,
  setSelectedTask,
}: TaskContextBannerProps) {
  // Derive subtasks from the tasks array (same pattern as unified-task-item)
  const childTasks = useMemo(() => {
    return tasks.filter((t) => t.parentId === task.id);
  }, [task.id, tasks]);

  const subtaskProgress = useMemo(() => {
    if (childTasks.length === 0) return null;
    const completed = childTasks.filter(
      (t) => t.status === "done" || t.status === "canceled",
    ).length;
    return { completed, total: childTasks.length };
  }, [childTasks]);

  // Derive parent from tasks array, fall back to task.parent
  const parentTask = useMemo(() => {
    if (!task.parentId) return null;
    const found = tasks.find((t) => t.id === task.parentId);
    if (found)
      return {
        id: found.id,
        shortId: found.shortId,
        title: found.title,
        status: found.status,
      };
    return task.parent ?? null;
  }, [task.parentId, task.parent, tasks]);

  // Lazy-fetch relations (same pattern as TaskRelationsSection in sidebar)
  const [relations, setRelations] = useState<schema.TaskRelationWithTarget[]>(
    [],
  );

  const fetchRelations = useCallback(async () => {
    const result = await getTaskRelationsAction(task.organizationId, task.id);
    if (result.success && result.data) {
      setRelations(result.data);
    }
  }, [task.organizationId, task.id]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const blockedByRelations = useMemo(
    () =>
      relations.filter(
        (r) => r.type === "blocking" && r.direction === "target",
      ),
    [relations],
  );

  const blockingRelations = useMemo(
    () =>
      relations.filter(
        (r) => r.type === "blocking" && r.direction === "source",
      ),
    [relations],
  );

  const relatedRelations = useMemo(
    () => relations.filter((r) => r.type === "related"),
    [relations],
  );

  const duplicateRelations = useMemo(
    () => relations.filter((r) => r.type === "duplicate"),
    [relations],
  );

  const hasSubtasks = childTasks.length > 0;
  const hasParent = !!parentTask;
  const hasBlockedBy = blockedByRelations.length > 0;
  const hasBlocking = blockingRelations.length > 0;
  const hasRelated = relatedRelations.length > 0;
  const hasDuplicates = duplicateRelations.length > 0;

  // Render nothing if there's no context to show
  if (
    !hasSubtasks &&
    !hasParent &&
    !hasBlockedBy &&
    !hasBlocking &&
    !hasRelated &&
    !hasDuplicates
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Parent task section */}
      {hasParent && parentTask && (
        <ContextSection label="Subtask of">
          <RelationTaskRow
            taskData={parentTask}
            orgId={task.organizationId}
            tasks={tasks}
            setTasks={setTasks}
            setSelectedTask={setSelectedTask}
          />
        </ContextSection>
      )}

      {/* Blocked by section */}
      {hasBlockedBy && (
        <ContextSection
          label="Blocked by"
        >
          {blockedByRelations.map((r) => (
            <RelationTaskRow
              key={r.id}
              taskData={r.task}
              orgId={task.organizationId}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </ContextSection>
      )}

      {/* Blocking section */}
      {hasBlocking && (
        <ContextSection
          label="Blocking"
          icon={<IconArrowUpRight className="h-3 w-3 text-muted-foreground" />}
        >
          {blockingRelations.map((r) => (
            <RelationTaskRow
              key={r.id}
              taskData={r.task}
              orgId={task.organizationId}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </ContextSection>
      )}

      {/* Related section */}
      {hasRelated && (
        <ContextSection
          label="Related to"
          icon={<IconLink className="h-3 w-3 text-muted-foreground" />}
        >
          {relatedRelations.map((r) => (
            <RelationTaskRow
              key={r.id}
              taskData={r.task}
              orgId={task.organizationId}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </ContextSection>
      )}

      {/* Duplicate section */}
      {hasDuplicates && (
        <ContextSection
          label={
            duplicateRelations.length === 1 && duplicateRelations[0]
              ? duplicateRelations[0].direction === "source"
                ? "Duplicate of"
                : "Duplicated by"
              : "Duplicates"
          }
          icon={<IconCopy className="h-3 w-3 text-muted-foreground" />}
        >
          {duplicateRelations.map((r) => (
            <RelationTaskRow
              key={r.id}
              taskData={r.task}
              orgId={task.organizationId}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </ContextSection>
      )}

      {/* Subtasks section */}
      {hasSubtasks && subtaskProgress && (
        <ContextSection
          label="Sub tasks"
          trailing={
            <SubtaskProgressBadge
              completed={subtaskProgress.completed}
              total={subtaskProgress.total}
            />
          }
        >
          {childTasks.map((child) => (
            <RelationTaskRow
              key={child.id}
              taskData={child}
              orgId={task.organizationId}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </ContextSection>
      )}
    </div>
  );
}
