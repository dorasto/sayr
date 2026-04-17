import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import {
  IconCalendarEvent,
  IconCalendarStats,
  IconCalendarTime,
  IconListCheck,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useLayoutReleaseOptional } from "@/contexts/ContextOrgRelease";
import {
  getReleaseReleasedAtUpdatePayload,
  getReleaseStatusDisplay,
  getReleaseStatusOptions,
  getReleaseStatusUpdatePayload,
  getReleaseTargetDateUpdatePayload,
  useReleaseFieldAction,
} from "./actions";
import { releaseStatusConfig, type ReleaseStatusKey } from "./config";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxIcon,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
  ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  searchOrgTasks,
  type OrgTaskSearchResult,
} from "@/lib/fetches/searchTasks";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { IconLoader2 } from "@tabler/icons-react";
import { TaskPickerItem } from "@/components/tasks/shared/task-picker";
import { Label } from "@repo/ui/components/label";

type ReleaseFieldKey = "status" | "targetDate" | "releasedAt" | "tasks";

interface ReleaseFieldToolbarProps {
  release: schema.releaseType | schema.ReleaseWithTasks;
  /** "toolbar" = compact pill buttons (creator/header); "sidebar" = badge + date pickers */
  variant?: "toolbar" | "sidebar";
  /** Which fields to show. Defaults to all three (tasks excluded by default). */
  fields?: ReleaseFieldKey[];
  /** Whether fields are interactive. */
  editable?: boolean;
  /**
   * Per-field change callbacks for draft/creator mode.
   * When provided alongside a draft release (id === "draft"), these are
   * called instead of (the skipped) API calls so the parent can update
   * local state.
   */
  onChange?: {
    status?: (status: ReleaseStatusKey) => void;
    targetDate?: (date: Date | null) => void;
    releasedAt?: (date: Date | null) => void;
    /** Called with the full updated task list on every add/remove. */
    tasks?: (tasks: OrgTaskSearchResult[]) => void;
  };
  /**
   * Fallback setter for contexts that live outside the LayoutReleaseProvider
   * (e.g. the create dialog). When omitted the toolbar reads from the provider.
   */
  onReleaseChange?: (
    updater: (
      prev: schema.ReleaseWithTasks | null,
    ) => schema.ReleaseWithTasks | null,
  ) => void;
}

const DEFAULT_FIELDS: ReleaseFieldKey[] = [
  "status",
  "targetDate",
  "releasedAt",
];

/**
 * Self-contained toolbar/sidebar for editing release fields.
 * Mirrors `TaskFieldToolbar` — handles its own API calls internally.
 */
export function ReleaseFieldToolbar({
  release,
  variant = "toolbar",
  fields = DEFAULT_FIELDS,
  editable = true,
  onChange,
  onReleaseChange,
}: ReleaseFieldToolbarProps) {
  // Always call the safe hook (no conditional), then prefer prop override.
  const releaseCtx = useLayoutReleaseOptional();
  const setRelease: (
    updater: (
      prev: schema.ReleaseWithTasks | null,
    ) => schema.ReleaseWithTasks | null,
  ) => void =
    onReleaseChange ??
    (releaseCtx?.setRelease as typeof setRelease) ??
    (() => {});

  const { execute } = useReleaseFieldAction(release, setRelease);

  // ── Task picker state (toolbar variant only) ───────────────────────
  const { organization } = useLayoutOrganization();
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskResults, setTaskResults] = useState<OrgTaskSearchResult[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<OrgTaskSearchResult[]>([]);

  // ── Status ────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!newStatus || newStatus === release.status) return;
      const key = newStatus as ReleaseStatusKey;

      // Call parent onChange for draft/local state (always, even for drafts)
      onChange?.status?.(key);

      const payload = getReleaseStatusUpdatePayload(
        release.releasedAt ?? null,
        key,
      );
      await execute(payload);
    },
    [release.status, release.releasedAt, onChange, execute],
  );

  // ── Target date ───────────────────────────────────────────────────

  const handleTargetDateChange = useCallback(
    async (date: Date | null | undefined) => {
      const d = date ?? null;
      onChange?.targetDate?.(d);
      await execute(getReleaseTargetDateUpdatePayload(d));
    },
    [onChange, execute],
  );

  // ── Released at ───────────────────────────────────────────────────

  const handleReleasedAtChange = useCallback(
    async (date: Date | null | undefined) => {
      const d = date ?? null;
      onChange?.releasedAt?.(d);
      await execute(getReleaseReleasedAtUpdatePayload(d));
    },
    [onChange, execute],
  );

  // ── Tasks ─────────────────────────────────────────────────────────

  const handleTaskSearch = useCallback(
    async (query: string) => {
      setTaskSearch(query);
      setTaskSearchLoading(true);
      try {
        const data = await searchOrgTasks(organization.id, query, 20);
        setTaskResults(data);
      } finally {
        setTaskSearchLoading(false);
      }
    },
    [organization.id],
  );

  const handleTaskPickerOpen = useCallback(
    (open: boolean) => {
      setTaskPickerOpen(open);
      if (open) {
        handleTaskSearch("");
      } else {
        setTaskSearch("");
        setTaskResults([]);
      }
    },
    [handleTaskSearch],
  );

  // Multi-select: receives the full new list of selected IDs from ComboBox
  const handleValuesChange = useCallback(
    (newIds: string[]) => {
      // Resolve added IDs from current search results, keep existing selected tasks for removals
      const next = [
        ...selectedTasks.filter((t) => newIds.includes(t.id)),
        ...newIds
          .filter((id) => !selectedTasks.some((t) => t.id === id))
          .map((id) => taskResults.find((t) => t.id === id))
          .filter((t): t is OrgTaskSearchResult => !!t),
      ];
      setSelectedTasks(next);
      onChange?.tasks?.(next);
    },
    [selectedTasks, taskResults, onChange],
  );

  // ── Render ────────────────────────────────────────────────────────

  const statusOptions = getReleaseStatusOptions();
  const currentStatus = release.status as ReleaseStatusKey;
  const statusDisplay = getReleaseStatusDisplay(currentStatus);

  const showField = (key: ReleaseFieldKey) => fields.includes(key);

  if (variant === "sidebar") {
    return (
      <div className="flex flex-col gap-3">
        {/* Status */}
        {showField("status") && (
          <div className="flex flex-col gap-1.5">
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="primary"
                    size="sm"
                    className={cn(
                      "border-transparent! rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                      releaseStatusConfig[currentStatus].badgeClassName,
                    )}
                  >
                    {releaseStatusConfig[currentStatus].icon("w-3 h-3")}
                    {releaseStatusConfig[currentStatus].label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {statusOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => handleStatusChange(opt.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-1 py-0.5 rounded-lg w-fit",
                  releaseStatusConfig[currentStatus].badgeClassName,
                )}
              >
                {releaseStatusConfig[currentStatus].icon("w-3 h-3")}
                {releaseStatusConfig[currentStatus].label}
              </span>
            )}
          </div>
        )}

        {/* Target Date */}
        {showField("targetDate") && (
          <div className="flex flex-col gap-1.5">
            {editable ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="primary"
                    size="sm"
                    className={cn(
                      "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                      release.targetDate
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <IconCalendarEvent className="w-3 h-3" />
                    {release.targetDate
                      ? formatDate(release.targetDate)
                      : "No target date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      release.targetDate
                        ? new Date(release.targetDate)
                        : undefined
                    }
                    onSelect={(d) => handleTargetDateChange(d)}
                  />
                  {release.targetDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="primary"
                        size="sm"
                        className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
                        onClick={() => handleTargetDateChange(null)}
                      >
                        <IconX className="w-3 h-3 mr-1" />
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className={cn(
                  "text-xs",
                  release.targetDate
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <IconCalendarEvent className="w-3 h-3 inline mr-1" />
                {release.targetDate
                  ? formatDate(release.targetDate)
                  : "No target date"}
              </span>
            )}
          </div>
        )}

        {/* Released At */}
        {showField("releasedAt") && (
          <div className="flex flex-col gap-1.5">
            {editable ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="primary"
                    size="sm"
                    className={cn(
                      "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                      release.releasedAt
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <IconCalendarEvent className="w-3 h-3" />
                    {release.releasedAt
                      ? formatDate(release.releasedAt)
                      : "No release date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      release.releasedAt
                        ? new Date(release.releasedAt)
                        : undefined
                    }
                    onSelect={(d) => handleReleasedAtChange(d)}
                  />
                  {release.releasedAt && (
                    <div className="p-2 border-t">
                      <Button
                        variant="primary"
                        size="sm"
                        className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
                        onClick={() => handleReleasedAtChange(null)}
                      >
                        <IconX className="w-3 h-3 mr-1" />
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className={cn(
                  "text-xs",
                  release.releasedAt
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <IconCalendarEvent className="w-3 h-3 inline mr-1" />
                {release.releasedAt
                  ? formatDate(release.releasedAt)
                  : "No release date"}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Toolbar variant (creator / compact) ───────────────────────────
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showField("status") && (
        <ComboBox
          value={currentStatus}
          onValueChange={(v) => v && handleStatusChange(v)}
        >
          <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
            <ComboBoxValue placeholder="Status">
              <div className="flex items-center gap-1.5">
                {statusDisplay.icon}
                <span>{statusDisplay.label}</span>
              </div>
            </ComboBoxValue>
            <ComboBoxIcon />
          </ComboBoxTrigger>
          <ComboBoxContent>
            <ComboBoxList>
              <ComboBoxEmpty>Not found</ComboBoxEmpty>
              <ComboBoxGroup>
                {statusOptions.map((opt) => (
                  <ComboBoxItem key={opt.id} value={opt.id}>
                    {opt.icon}
                    <span className="ml-2">{opt.label}</span>
                  </ComboBoxItem>
                ))}
              </ComboBoxGroup>
            </ComboBoxList>
          </ComboBoxContent>
        </ComboBox>
      )}

      {showField("targetDate") && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2",
                release.targetDate ? "" : "text-muted-foreground",
              )}
            >
              <IconCalendarStats className="h-3.5 w-3.5" />
              {release.targetDate
                ? formatDate(release.targetDate)
                : "Target date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 flex items-center gap-2 bg-accent">
              <Label variant={"subheading"}>Target date</Label>

              <Button
                variant="primary"
                size="sm"
                className={cn(
                  "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1 justify-start text-xs h-auto p-1 w-fit ml-auto",
                  !release.targetDate && "invisible",
                )}
                onClick={() => handleTargetDateChange(null)}
              >
                <IconX className="" />
                Clear
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={
                release.targetDate ? new Date(release.targetDate) : undefined
              }
              onSelect={(d) => handleTargetDateChange(d)}
              className="bg-card"
            />
          </PopoverContent>
        </Popover>
      )}

      {showField("releasedAt") && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2",
                release.releasedAt ? "" : "text-muted-foreground",
              )}
            >
              <IconCalendarEvent className="h-3.5 w-3.5" />
              {release.releasedAt
                ? formatDate(release.releasedAt)
                : "Release date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                release.releasedAt ? new Date(release.releasedAt) : undefined
              }
              onSelect={(d) => handleReleasedAtChange(d)}
            />
            {release.releasedAt && (
              <div className="p-2 border-t">
                <Button
                  variant="primary"
                  size="sm"
                  className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
                  onClick={() => handleReleasedAtChange(null)}
                >
                  <IconX className="w-3 h-3 mr-1" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {showField("tasks") && (
        <ComboBox
          values={selectedTasks.map((t) => t.id)}
          onValuesChange={handleValuesChange}
          open={taskPickerOpen}
          onOpenChange={handleTaskPickerOpen}
        >
          <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
            <ComboBoxValue placeholder="Add tasks">
              <div className="flex items-center gap-1.5">
                <IconListCheck className="h-3.5 w-3.5" />
                <span>
                  {selectedTasks.length > 0
                    ? `${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"}`
                    : "Add tasks"}
                </span>
              </div>
            </ComboBoxValue>
            <ComboBoxIcon />
          </ComboBoxTrigger>
          <ComboBoxContent shouldFilter={false}>
            <ComboBoxSearch
              icon
              placeholder="Search tasks..."
              onValueChange={handleTaskSearch}
            />
            <ComboBoxList>
              {taskSearchLoading ? (
                <div className="flex items-center justify-center py-4">
                  <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : taskResults.length === 0 && selectedTasks.length === 0 ? (
                <ComboBoxEmpty>
                  {taskSearch.length > 0 ? "No tasks found" : "No recent tasks"}
                </ComboBoxEmpty>
              ) : (
                <ComboBoxGroup>
                  {selectedTasks.map((t) => (
                    <ComboBoxItem key={t.id} value={t.id}>
                      <span className="">
                        <TaskPickerItem task={t} />
                      </span>
                    </ComboBoxItem>
                  ))}
                  {taskResults
                    .filter((t) => !selectedTasks.some((s) => s.id === t.id))
                    .map((t) => (
                      <ComboBoxItem key={t.id} value={t.id}>
                        <TaskPickerItem task={t} />
                      </ComboBoxItem>
                    ))}
                </ComboBoxGroup>
              )}
            </ComboBoxList>
          </ComboBoxContent>
        </ComboBox>
      )}
    </div>
  );
}
