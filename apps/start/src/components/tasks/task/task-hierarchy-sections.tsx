import { useState, useEffect, useCallback } from "react";
import type { schema } from "@repo/database";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import {
  IconArrowUpRight,
  IconLink,
  IconCopy,
  IconPlus,
  IconX,
  IconForbid,
  IconForbidFilled,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import TaskPicker, { TaskPickerItem } from "../shared/task-picker";
import {
  setTaskParentAction,
  removeTaskParentAction,
  getSubtasksAction,
  createTaskRelationAction,
  removeTaskRelationAction,
} from "@/lib/fetches/task";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import type { useToastAction } from "@/lib/util";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";

/**
 * Shared className for clickable task items in sidebar hierarchy sections.
 * Matches the visual appearance of sidebar field buttons (ComboBoxTrigger + variant="primary" + sidebar overrides).
 */
const SIDEBAR_ITEM_CLASS =
  "inline-flex items-center gap-2 min-w-0 flex-1 rounded-lg p-1 text-xs font-medium transition-colors border border-transparent hover:border-border bg-transparent hover:bg-secondary cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0";

/**
 * Shared className for "Set parent", "Add subtask", "Add relation" trigger buttons.
 * Same sizing/padding as SIDEBAR_ITEM_CLASS but w-fit and muted text for the "empty" state look.
 */
const SIDEBAR_ADD_BUTTON_CLASS =
  "inline-flex items-center gap-1 w-fit rounded-lg p-1 text-xs font-medium transition-colors border border-transparent hover:border-border bg-transparent hover:bg-secondary cursor-pointer text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0";

interface HierarchySectionProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
  wsClientId: string;
  runWithToast: typeof useToastAction extends () => { runWithToast: infer T }
    ? T
    : never;
}

/* -------------------------------------------------------------------------- */
/*                            Parent Task Section                             */
/* -------------------------------------------------------------------------- */

export function TaskParentSection({
  task,
  tasks,
  setTasks,
  setSelectedTask,
  wsClientId,
  runWithToast,
}: HierarchySectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Hide entirely when task has subtasks (cannot be nested)
  const hasSubtasks = (task.subtaskCount ?? 0) > 0;
  if (hasSubtasks) return null;

  const handleSetParent = async (parentTask: OrgTaskSearchResult) => {
    setPickerOpen(false);

    // Optimistic update
    const updatedTask = {
      ...task,
      parentId: parentTask.id,
      parent: {
        id: parentTask.id,
        shortId: parentTask.shortId,
        title: parentTask.title,
        status: parentTask.status,
      },
    };
    setSelectedTask(updatedTask);
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

    const data = await runWithToast(
      "set-task-parent",
      {
        loading: {
          title: "Setting parent...",
          description: "Linking task to parent.",
        },
        success: { title: "Parent set", description: "Task is now a subtask." },
        error: {
          title: "Failed",
          description: "Could not set parent task. Please try again.",
        },
      },
      () =>
        setTaskParentAction(
          task.organizationId,
          task.id,
          parentTask.id,
          wsClientId,
        ),
    );

    if (data?.success && data.data) {
      setSelectedTask(data.data);
      setTasks(
        tasks.map((t) => (t.id === task.id && data.data ? data.data : t)),
      );
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    }
  };

  const handleRemoveParent = async () => {
    // Optimistic update
    const updatedTask = { ...task, parentId: null, parent: null };
    setSelectedTask(updatedTask);
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

    const data = await runWithToast(
      "remove-task-parent",
      {
        loading: {
          title: "Removing parent...",
          description: "Promoting to top-level task.",
        },
        success: {
          title: "Parent removed",
          description: "Task is now a top-level task.",
        },
        error: {
          title: "Failed",
          description: "Could not remove parent. Please try again.",
        },
      },
      () => removeTaskParentAction(task.organizationId, task.id, wsClientId),
    );

    if (data?.success && data.data) {
      setSelectedTask(data.data);
      setTasks(
        tasks.map((t) => (t.id === task.id && data.data ? data.data : t)),
      );
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    }
  };

  return (
    <div className="p-1 flex flex-col gap-2 max-w-full">
      <Tile
        className="md:w-full items-start p-0 flex-col gap-1"
        variant="transparent"
      >
        <TileHeader>
          <TileTitle asChild>
            <Label variant="description" className="text-xs">
              Parent task
            </Label>
          </TileTitle>
        </TileHeader>
        <TileAction>
          {task.parent ? (
            <div className="flex items-center gap-1 group/parent w-full">
              <Link
                to="/$orgId/tasks/$taskShortId"
                params={{
                  orgId: task.organizationId,
                  taskShortId: String(task.parent.shortId),
                }}
                className={SIDEBAR_ITEM_CLASS}
              >
                <TaskPickerItem task={task.parent} />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover/parent:opacity-100 shrink-0"
                onClick={handleRemoveParent}
              >
                <IconX className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <TaskPicker
              organizationId={task.organizationId}
              onSelect={handleSetParent}
              excludeIds={[task.id]}
              filter={(t) => !t.parentId}
              searchPlaceholder="Search for parent task..."
              placeholder="Set parent task"
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              customTrigger={
                <button type="button" className={SIDEBAR_ADD_BUTTON_CLASS}>
                  <IconPlus className="h-3 w-3" />
                  <span>Set parent</span>
                </button>
              }
            />
          )}
        </TileAction>
      </Tile>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Subtasks Section                                 */
/* -------------------------------------------------------------------------- */

export function TaskSubtasksSection({
  task,
  tasks,
  setTasks,
  setSelectedTask,
  wsClientId,
  runWithToast,
}: HierarchySectionProps) {
  const [subtasks, setSubtasks] = useState<schema.SubtaskSummary[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch subtasks when component mounts or subtaskCount changes
  const fetchSubtasks = useCallback(async () => {
    if ((task.subtaskCount ?? 0) === 0) {
      setSubtasks([]);
      return;
    }
    try {
      const result = await getSubtasksAction(task.organizationId, task.id);
      if (result.success && result.data) {
        setSubtasks(result.data);
      }
    } catch {
      // Silently fail
    }
  }, [task.organizationId, task.id, task.subtaskCount]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const handleAddSubtask = async (childTask: OrgTaskSearchResult) => {
    setPickerOpen(false);

    // Optimistic: add to local subtask list
    const newSubtask: schema.SubtaskSummary = {
      id: childTask.id,
      shortId: childTask.shortId,
      title: childTask.title,
      status: childTask.status,
      priority: childTask.priority,
      assignees: [],
    };
    setSubtasks((prev) => [...prev, newSubtask]);

    // Optimistic: update parent's subtaskCount
    const updatedTask = { ...task, subtaskCount: (task.subtaskCount ?? 0) + 1 };
    setSelectedTask(updatedTask);
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

    const data = await runWithToast(
      "add-subtask",
      {
        loading: {
          title: "Adding subtask...",
          description: "Linking task as subtask.",
        },
        success: {
          title: "Subtask added",
          description: "Task is now a subtask.",
        },
        error: {
          title: "Failed",
          description: "Could not add subtask. Please try again.",
        },
      },
      () =>
        setTaskParentAction(
          task.organizationId,
          childTask.id,
          task.id,
          wsClientId,
        ),
    );

    if (data?.success) {
      // Refetch to get accurate data
      fetchSubtasks();
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    } else {
      // Revert optimistic update
      setSubtasks((prev) => prev.filter((s) => s.id !== childTask.id));
      setSelectedTask(task);
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
    }
  };

  const handleRemoveSubtask = async (subtaskId: string) => {
    // Optimistic: remove from local list
    const removedSubtask = subtasks.find((s) => s.id === subtaskId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

    const updatedTask = {
      ...task,
      subtaskCount: Math.max(0, (task.subtaskCount ?? 0) - 1),
    };
    setSelectedTask(updatedTask);
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

    const data = await runWithToast(
      "remove-subtask",
      {
        loading: {
          title: "Removing subtask...",
          description: "Promoting task to top-level.",
        },
        success: {
          title: "Subtask removed",
          description: "Task is now a top-level task.",
        },
        error: {
          title: "Failed",
          description: "Could not remove subtask. Please try again.",
        },
      },
      () => removeTaskParentAction(task.organizationId, subtaskId, wsClientId),
    );

    if (data?.success) {
      fetchSubtasks();
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    } else if (removedSubtask) {
      // Revert optimistic update
      setSubtasks((prev) => [...prev, removedSubtask]);
      setSelectedTask(task);
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
    }
  };

  // If this task is a subtask itself, it can't have subtasks (single-level)
  if (task.parentId) {
    return null;
  }

  const subtaskIds = subtasks.map((s) => s.id);

  return (
    <div className="p-1 flex flex-col gap-2 max-w-full">
      <Tile
        className="md:w-full items-start p-0 flex-col gap-1"
        variant="transparent"
      >
        {subtasks.length > 0 && (
          <TileHeader>
            <TileTitle asChild>
              <Label variant="description" className="text-xs">
                Subtasks
              </Label>
            </TileTitle>
          </TileHeader>
        )}
        <TileAction>
          <div className="flex flex-col gap-0.5 w-full">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-1 group/subtask w-full"
              >
                <Link
                  to="/$orgId/tasks/$taskShortId"
                  params={{
                    orgId: task.organizationId,
                    taskShortId: String(subtask.shortId),
                  }}
                  className={SIDEBAR_ITEM_CLASS}
                >
                  <TaskPickerItem task={subtask} />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover/subtask:opacity-100 shrink-0"
                  onClick={() => handleRemoveSubtask(subtask.id)}
                >
                  <IconX className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <TaskPicker
              organizationId={task.organizationId}
              onSelect={handleAddSubtask}
              excludeIds={[task.id, ...subtaskIds]}
              filter={(t) => !t.parentId && (t.subtaskCount ?? 0) === 0}
              searchPlaceholder="Search for task to add as subtask..."
              placeholder="Add subtask"
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              customTrigger={
                <button type="button" className={SIDEBAR_ADD_BUTTON_CLASS}>
                  <IconPlus className="h-3 w-3" />
                  <span>Add subtask</span>
                </button>
              }
            />
          </div>
        </TileAction>
      </Tile>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Relations Section                                 */
/* -------------------------------------------------------------------------- */

const RELATION_TYPE_LABELS: Record<
  string,
  { sourceLabel: string; targetLabel: string; icon: React.ReactNode }
> = {
  blocking: {
    sourceLabel: "Blocking",
    targetLabel: "Blocked by",
    icon: <IconForbidFilled className="h-3 w-3 text-destructive/80" />,
  },
  related: {
    sourceLabel: "Related to",
    targetLabel: "Related to",
    icon: <IconLink className="h-3 w-3 text-muted-foreground" />,
  },
  duplicate: {
    sourceLabel: "Duplicate of",
    targetLabel: "Duplicated by",
    icon: <IconCopy className="h-3 w-3 text-muted-foreground" />,
  },
};

/** Grouping key for display: direction-aware label (e.g., "Blocked by", "Blocking", "Related to") */
function getRelationGroupKey(relation: schema.TaskRelationWithTarget): string {
  const config = RELATION_TYPE_LABELS[relation.type];
  if (!config) return relation.type;
  return relation.direction === "source"
    ? config.sourceLabel
    : config.targetLabel;
}

function getRelationIcon(
  relation: schema.TaskRelationWithTarget,
): React.ReactNode {
  return RELATION_TYPE_LABELS[relation.type]?.icon ?? null;
}

/** Group relations by their display label (Blocked by, Blocking, Related to, etc.) */
function groupRelations(
  relations: schema.TaskRelationWithTarget[],
): Map<string, schema.TaskRelationWithTarget[]> {
  const groups = new Map<string, schema.TaskRelationWithTarget[]>();
  for (const rel of relations) {
    const key = getRelationGroupKey(rel);
    const group = groups.get(key);
    if (group) {
      group.push(rel);
    } else {
      groups.set(key, [rel]);
    }
  }
  return groups;
}

export function TaskRelationsSection({
  task,
  wsClientId,
  runWithToast,
}: HierarchySectionProps) {
  const relations = task.relations ?? [];
  const [addingType, setAddingType] = useState<
    "related" | "blocking" | "duplicate" | null
  >(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const handleAddRelation = async (targetTask: OrgTaskSearchResult) => {
    if (!addingType) return;
    const type = addingType;
    setAddingType(null);

    const data = await runWithToast(
      "add-task-relation",
      {
        loading: {
          title: "Adding relation...",
          description: `Linking tasks as ${type}.`,
        },
        success: {
          title: "Relation added",
          description: "Tasks are now linked.",
        },
        error: {
          title: "Failed",
          description: "Could not add relation. Please try again.",
        },
      },
      () =>
        createTaskRelationAction(
          task.organizationId,
          task.id,
          targetTask.id,
          type,
          wsClientId,
        ),
    );

    if (data?.success) {
      // Relations will be updated via WebSocket broadcast (task.relations)
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    }
  };

  const handleRemoveRelation = async (
    relation: schema.TaskRelationWithTarget,
  ) => {
    // Determine source and target IDs for the backend
    const sourceTaskId =
      relation.direction === "source" ? task.id : relation.task.id;
    const targetTaskId =
      relation.direction === "source" ? relation.task.id : task.id;

    const data = await runWithToast(
      "remove-task-relation",
      {
        loading: {
          title: "Removing relation...",
          description: "Unlinking tasks.",
        },
        success: {
          title: "Relation removed",
          description: "Tasks are no longer linked.",
        },
        error: {
          title: "Failed",
          description: "Could not remove relation. Please try again.",
        },
      },
      () =>
        removeTaskRelationAction(
          task.organizationId,
          relation.id,
          sourceTaskId,
          targetTaskId,
          wsClientId,
        ),
    );

    if (data?.success) {
      // Relations will be updated via WebSocket broadcast (task.relations)
      sendWindowMessage(
        window,
        { type: "timeline-update", payload: task.id },
        "*",
      );
    }
  };

  // Existing relation target IDs (to prevent duplicates)
  const existingRelationIds = relations.map((r) => r.task.id);

  // Group relations by type for display
  const groupedRelations = groupRelations(relations);

  return (
    <>
      {/* Each relation type group is its own top-level Tile section */}
      {Array.from(groupedRelations.entries()).map(
        ([groupLabel, groupRelations]) => (
          <div key={groupLabel} className="p-1 flex flex-col gap-2 max-w-full">
            <Tile
              className="md:w-full items-start p-0 flex-col gap-1"
              variant="transparent"
            >
              <TileHeader>
                <TileTitle asChild>
                  <Label variant="description" className="text-xs">
                    {groupLabel}
                  </Label>
                </TileTitle>
              </TileHeader>
              <TileAction>
                <div className="flex flex-col gap-0.5 w-full">
                  {groupRelations.map((relation) => (
                    <div
                      key={relation.id}
                      className="flex items-center gap-1 group/relation w-full"
                    >
                      <Link
                        to="/$orgId/tasks/$taskShortId"
                        params={{
                          orgId: task.organizationId,
                          taskShortId: String(relation.task.shortId),
                        }}
                        className={SIDEBAR_ITEM_CLASS}
                      >
                        {getRelationIcon(relation)}
                        <TaskPickerItem
                          task={relation.task}
                          className="flex-1"
                        />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/relation:opacity-100 shrink-0"
                        onClick={() => handleRemoveRelation(relation)}
                      >
                        <IconX className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TileAction>
            </Tile>
          </div>
        ),
      )}

      {/* Add relation — top-level section matching sidebar styling */}
      <div className="p-1 flex flex-col gap-2 max-w-full">
        {addingType ? (
          <TaskPicker
            organizationId={task.organizationId}
            onSelect={handleAddRelation}
            excludeIds={[task.id, ...existingRelationIds]}
            searchPlaceholder={`Search for task to link as ${addingType}...`}
            placeholder="Select task"
            open={true}
            onOpenChange={(open) => {
              if (!open) setAddingType(null);
            }}
            customTrigger={
              <button type="button" className={SIDEBAR_ADD_BUTTON_CLASS}>
                <IconPlus className="h-3 w-3" />
                <span>Select {addingType} task...</span>
              </button>
            }
          />
        ) : (
          <ComboBox
            value=""
            onValueChange={(val) => {
              if (
                val === "related" ||
                val === "blocking" ||
                val === "duplicate"
              ) {
                setAddingType(val);
              }
              setTypePickerOpen(false);
            }}
            open={typePickerOpen}
            onOpenChange={setTypePickerOpen}
          >
            <ComboBoxTrigger asChild>
              <button type="button" className={SIDEBAR_ADD_BUTTON_CLASS}>
                <IconPlus className="h-3 w-3" />
                <span>Add relation</span>
              </button>
            </ComboBoxTrigger>
            <ComboBoxContent>
              <ComboBoxList>
                <ComboBoxGroup>
                  <ComboBoxItem value="blocking" searchValue="blocking blocks">
                    <div className="flex items-center gap-2">
                      <IconArrowUpRight className="h-4 w-4 text-destructive" />
                      <span>Blocking</span>
                    </div>
                  </ComboBoxItem>
                  <ComboBoxItem value="related" searchValue="related">
                    <div className="flex items-center gap-2">
                      <IconLink className="h-4 w-4 text-muted-foreground" />
                      <span>Related to</span>
                    </div>
                  </ComboBoxItem>
                  <ComboBoxItem value="duplicate" searchValue="duplicate">
                    <div className="flex items-center gap-2">
                      <IconCopy className="h-4 w-4 text-muted-foreground" />
                      <span>Duplicate of</span>
                    </div>
                  </ComboBoxItem>
                </ComboBoxGroup>
              </ComboBoxList>
            </ComboBoxContent>
          </ComboBox>
        )}
      </div>
    </>
  );
}
