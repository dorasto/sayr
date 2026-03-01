"use client";

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import {
  TriStateCheckbox,
  type TriState,
} from "@repo/ui/components/doras-ui/tri-state-checkbox";
import {
  IconCategory,
  IconCheck,
  IconCircleFilled,
  IconMinus,
  IconRocket,
  IconTag,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseStatusConfig } from "@/components/releases/config";
import { priorityConfig, statusConfig } from "../shared/config";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeTriState(
  tasks: schema.TaskWithLabels[],
  predicate: (task: schema.TaskWithLabels) => boolean,
): TriState {
  if (tasks.length === 0) return "none";
  const count = tasks.filter(predicate).length;
  if (count === tasks.length) return "all";
  if (count > 0) return "some";
  return "none";
}

function TriStateIcon({ state }: { state: TriState }) {
  if (state === "all")
    return <IconCheck className="h-3 w-3 ml-auto shrink-0 text-foreground" />;
  if (state === "some")
    return (
      <IconMinus className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
    );
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BulkUpdateAddRemove {
  add: string[];
  remove: string[];
}

interface BulkActionBarProps {
  selectedCount: number;
  selectedTasks: schema.TaskWithLabels[];
  visible: boolean;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onBulkUpdate: (field: string, value: unknown) => void;
  compact?: boolean;
  // Data for pickers
  availableUsers: schema.userType[];
  availableLabels?: schema.labelType[];
  categories?: schema.categoryType[];
  releases?: schema.releaseType[];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BulkActionBar({
  selectedCount,
  selectedTasks,
  visible,
  onDeselectAll,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  onBulkUpdate,
  compact = false,
  availableUsers,
  availableLabels = [],
  categories = [],
  releases = [],
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-9999999 flex items-center gap-1 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-2 py-1.5"
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 px-2">
            <TriStateCheckbox
              state={isAllSelected ? "all" : isIndeterminate ? "some" : "none"}
              onClick={() => {
                if (isAllSelected) {
                  onDeselectAll();
                } else {
                  onSelectAll();
                }
              }}
              aria-label="Select all tasks"
            />
            <button
              type="button"
              className="text-xs font-medium whitespace-nowrap hover:underline cursor-pointer"
              onClick={() => {
                if (isAllSelected) {
                  onDeselectAll();
                } else {
                  onSelectAll();
                }
              }}
            >
              {selectedCount} selected
            </button>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Status */}
          <StatusPicker
            selectedTasks={selectedTasks}
            onSelect={(status) => onBulkUpdate("status", status)}
            compact={compact}
          />

          {/* Priority */}
          <PriorityPicker
            selectedTasks={selectedTasks}
            onSelect={(priority) => onBulkUpdate("priority", priority)}
            compact={compact}
          />

          {/* Assignee */}
          <AssigneePicker
            availableUsers={availableUsers}
            selectedTasks={selectedTasks}
            onSelect={(value) => onBulkUpdate("assignees", value)}
            compact={compact}
          />

          {/* Labels */}
          {availableLabels.length > 0 && (
            <LabelPicker
              availableLabels={availableLabels}
              selectedTasks={selectedTasks}
              onSelect={(value) => onBulkUpdate("labels", value)}
              compact={compact}
            />
          )}

          {/* Category */}
          {categories.length > 0 && (
            <CategoryPicker
              categories={categories}
              selectedTasks={selectedTasks}
              onSelect={(categoryId) => onBulkUpdate("category", categoryId)}
              compact={compact}
            />
          )}

          {/* Release */}
          {releases.length > 0 && (
            <ReleasePicker
              releases={releases}
              selectedTasks={selectedTasks}
              onSelect={(releaseId) => onBulkUpdate("release", releaseId)}
              compact={compact}
            />
          )}

          <Separator orientation="vertical" className="h-5" />

          {/* Deselect */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onDeselectAll}
          >
            <IconX className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Single-value pickers (Status, Priority, Category, Release) ──────────────

function StatusPicker({
  selectedTasks,
  onSelect,
  compact,
}: {
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (status: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          {statusConfig.todo.icon("h-3.5 w-3.5")}
          {!compact && <span>Status</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" side="top" align="center">
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
            Set Status
          </p>
          {Object.entries(statusConfig).map(([key, config]) => {
            const state = computeTriState(
              selectedTasks,
              (t) => t.status === key,
            );
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer",
                  state === "all" && "opacity-50 cursor-default",
                )}
                onClick={() => {
                  if (state === "all") return;
                  onSelect(key);
                  setOpen(false);
                }}
              >
                {config.icon(`h-3.5 w-3.5 ${config.className}`)}
                <span>{config.label}</span>
                <TriStateIcon state={state} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PriorityPicker({
  selectedTasks,
  onSelect,
  compact,
}: {
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (priority: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          {priorityConfig.medium.icon("h-3.5 w-3.5")}
          {!compact && <span>Priority</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" side="top" align="center">
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
            Set Priority
          </p>
          {Object.entries(priorityConfig).map(([key, config]) => {
            const state = computeTriState(
              selectedTasks,
              (t) => t.priority === key,
            );
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer",
                  state === "all" && "opacity-50 cursor-default",
                )}
                onClick={() => {
                  if (state === "all") return;
                  onSelect(key);
                  setOpen(false);
                }}
              >
                {config.icon(`h-3.5 w-3.5 ${config.className}`)}
                <span>{config.label}</span>
                <TriStateIcon state={state} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CategoryPicker({
  categories,
  selectedTasks,
  onSelect,
  compact,
}: {
  categories: schema.categoryType[];
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (categoryId: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          <IconCategory className="h-3.5 w-3.5" />
          {!compact && <span>Category</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" side="top" align="center">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              variant="ghost"
              className="h-7 text-xs"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const state = computeTriState(
                  selectedTasks,
                  (t) => t.category === category.id,
                );
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors w-full cursor-pointer",
                      state === "all" && "opacity-50 cursor-default",
                    )}
                    onClick={() => {
                      if (state === "all") return;
                      onSelect(category.id);
                      setOpen(false);
                    }}
                  >
                    <RenderIcon
                      iconName={category.icon || "IconCategory"}
                      size={14}
                      color={category.color || undefined}
                      raw
                    />
                    <span className="truncate">{category.name}</span>
                    <TriStateIcon state={state} />
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                No categories found
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReleasePicker({
  releases,
  selectedTasks,
  onSelect,
  compact,
}: {
  releases: schema.releaseType[];
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (releaseId: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredReleases = releases.filter((release) =>
    release.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          <IconRocket className="h-3.5 w-3.5" />
          {!compact && <span>Release</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="top" align="center">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              variant="ghost"
              className="h-7 text-xs"
              placeholder="Search releases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredReleases.length > 0 ? (
              filteredReleases.map((release) => {
                const state = computeTriState(
                  selectedTasks,
                  (t) => t.releaseId === release.id,
                );
                return (
                  <button
                    key={release.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors w-full cursor-pointer",
                      state === "all" && "opacity-50 cursor-default",
                    )}
                    onClick={() => {
                      if (state === "all") return;
                      onSelect(release.id);
                      setOpen(false);
                    }}
                  >
                    {release.icon ? (
                      <div className="shrink-0">
                        <RenderIcon
                          iconName={release.icon}
                          size={14}
                          color={release.color || undefined}
                          raw
                        />
                      </div>
                    ) : (
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: release.color || "#cccccc" }}
                      />
                    )}
                    <span className="truncate">{release.name}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <Badge className="rounded-lg text-xs cursor-pointer gap-1.5 truncate max-w-20 bg-secondary pointer-events-none">
                        {release.slug}
                      </Badge>
                      <Badge
                        className={cn(
                          "border rounded-lg text-xs cursor-pointer gap-1.5 shrink-0",
                          releaseStatusConfig[release.status].badgeClassName,
                        )}
                      >
                        {releaseStatusConfig[release.status].icon("w-3 h-3")}
                        {releaseStatusConfig[release.status].label}
                      </Badge>
                      <TriStateIcon state={state} />
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                No releases found
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-value pickers (Assignees, Labels) ─────────────────────────────────

function AssigneePicker({
  availableUsers,
  selectedTasks,
  onSelect,
  compact,
}: {
  availableUsers: schema.userType[];
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (value: BulkUpdateAddRemove) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Track user intent: true = should be assigned, false = should be removed, undefined = unchanged
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  // Compute initial tri-state per user from selected tasks
  const initialStates = useMemo(() => {
    const map = new Map<string, TriState>();
    for (const user of availableUsers) {
      map.set(
        user.id,
        computeTriState(
          selectedTasks,
          (t) => t.assignees?.some((a) => a.id === user.id) ?? false,
        ),
      );
    }
    return map;
  }, [availableUsers, selectedTasks]);

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getEffectiveState = (userId: string): TriState => {
    const override = overrides.get(userId);
    if (override === true) return "all";
    if (override === false) return "none";
    return initialStates.get(userId) ?? "none";
  };

  const handleToggle = (userId: string) => {
    const current = getEffectiveState(userId);
    const next = new Map(overrides);
    if (current === "all") {
      // Currently on -> turn off
      next.set(userId, false);
    } else {
      // Currently off or indeterminate -> turn on
      next.set(userId, true);
    }
    setOverrides(next);
  };

  const hasChanges = useMemo(() => {
    for (const [userId, wantAssigned] of overrides) {
      const initial = initialStates.get(userId) ?? "none";
      if (wantAssigned && initial !== "all") return true;
      if (!wantAssigned && initial !== "none") return true;
    }
    return false;
  }, [overrides, initialStates]);

  const handleApply = () => {
    const add: string[] = [];
    const remove: string[] = [];
    for (const [userId, wantAssigned] of overrides) {
      const initial = initialStates.get(userId) ?? "none";
      if (wantAssigned && initial !== "all") {
        add.push(userId);
      } else if (!wantAssigned && initial !== "none") {
        remove.push(userId);
      }
    }
    if (add.length > 0 || remove.length > 0) {
      onSelect({ add, remove });
    }
    setOpen(false);
    setOverrides(new Map());
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setOverrides(new Map());
          setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          <IconUser className="h-3.5 w-3.5" />
          {!compact && <span>Assignee</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" side="top" align="center">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              variant="ghost"
              className="h-7 text-xs"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const effectiveState = getEffectiveState(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors w-full cursor-pointer"
                    onClick={() => handleToggle(user.id)}
                  >
                    <TriStateCheckbox
                      state={effectiveState}
                      className="pointer-events-none"
                    />
                    <Avatar className="h-5 w-5">
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback className="text-[8px]">
                        {user.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{user.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                No users found
              </p>
            )}
          </div>
          {hasChanges && (
            <div className="border-t p-1.5">
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleApply}
              >
                Apply changes
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LabelPicker({
  availableLabels,
  selectedTasks,
  onSelect,
  compact,
}: {
  availableLabels: schema.labelType[];
  selectedTasks: schema.TaskWithLabels[];
  onSelect: (value: BulkUpdateAddRemove) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  // Compute initial tri-state per label from selected tasks
  const initialStates = useMemo(() => {
    const map = new Map<string, TriState>();
    for (const label of availableLabels) {
      map.set(
        label.id,
        computeTriState(
          selectedTasks,
          (t) => t.labels?.some((l) => l.id === label.id) ?? false,
        ),
      );
    }
    return map;
  }, [availableLabels, selectedTasks]);

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getEffectiveState = (labelId: string): TriState => {
    const override = overrides.get(labelId);
    if (override === true) return "all";
    if (override === false) return "none";
    return initialStates.get(labelId) ?? "none";
  };

  const handleToggle = (labelId: string) => {
    const current = getEffectiveState(labelId);
    const next = new Map(overrides);
    if (current === "all") {
      next.set(labelId, false);
    } else {
      next.set(labelId, true);
    }
    setOverrides(next);
  };

  const hasChanges = useMemo(() => {
    for (const [labelId, wantLabel] of overrides) {
      const initial = initialStates.get(labelId) ?? "none";
      if (wantLabel && initial !== "all") return true;
      if (!wantLabel && initial !== "none") return true;
    }
    return false;
  }, [overrides, initialStates]);

  const handleApply = () => {
    const add: string[] = [];
    const remove: string[] = [];
    for (const [labelId, wantLabel] of overrides) {
      const initial = initialStates.get(labelId) ?? "none";
      if (wantLabel && initial !== "all") {
        add.push(labelId);
      } else if (!wantLabel && initial !== "none") {
        remove.push(labelId);
      }
    }
    if (add.length > 0 || remove.length > 0) {
      onSelect({ add, remove });
    }
    setOpen(false);
    setOverrides(new Map());
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setOverrides(new Map());
          setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
          <IconTag className="h-3.5 w-3.5" />
          {!compact && <span>Labels</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" side="top" align="center">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              variant="ghost"
              className="h-7 text-xs"
              placeholder="Search labels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredLabels.length > 0 ? (
              filteredLabels.map((label) => {
                const effectiveState = getEffectiveState(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors w-full cursor-pointer"
                    onClick={() => handleToggle(label.id)}
                  >
                    <TriStateCheckbox
                      state={effectiveState}
                      className="pointer-events-none"
                    />
                    <IconCircleFilled
                      className="h-3 w-3 shrink-0"
                      style={{ color: label.color || "var(--foreground)" }}
                    />
                    <span className="text-sm truncate">{label.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                No labels found
              </p>
            )}
          </div>
          {hasChanges && (
            <div className="border-t p-1.5">
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleApply}
              >
                Apply changes
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
