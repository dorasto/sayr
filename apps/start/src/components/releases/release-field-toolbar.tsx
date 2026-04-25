import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { formatDate, getDisplayName } from "@repo/util";
import {
  IconCalendarCheck,
  IconCalendarEvent,
  IconCalendarStats,
  IconLink,
  IconListCheck,
  IconPlus,
  IconTag,
  IconUser,
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
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { ensureCdnUrl } from "@repo/util";
import {
  addReleaseLabelAction,
  removeReleaseLabelAction,
  updateReleaseAction,
} from "@/lib/fetches/release";
import { RenderLabel, InlineCreateLabelForm } from "@/components/tasks/shared/label";
import { useToastAction } from "@/lib/util";
import { useMatch } from "@tanstack/react-router";

type ReleaseFieldKey =
  | "status"
  | "targetDate"
  | "releasedAt"
  | "tasks"
  | "publicPage"
  | "lead"
  | "labels";

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
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { runWithToast } = useToastAction();
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskResults, setTaskResults] = useState<OrgTaskSearchResult[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<OrgTaskSearchResult[]>([]);

  // ── Lead + Labels state ───────────────────────────────────────────
  const releaseWithTasks =
    "lead" in release ? (release as schema.ReleaseWithTasks) : null;
  const currentLead = releaseWithTasks?.lead ?? null;
  const currentLabels = releaseWithTasks?.labels ?? [];
  const { labels: orgLabels } = useLayoutOrganization();
  const [labelSearch, setLabelSearch] = useState("");

  // ── Permissions ───────────────────────────────────────────────────
  const orgMatch = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
  const permissions = orgMatch?.context?.permissions;
  const canCreateLabel =
    permissions?.admin?.administrator === true ||
    permissions?.content?.manageLabels === true;

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

  // ── Lead ──────────────────────────────────────────────────────────

  const handleLeadChange = useCallback(
    async (memberId: string | null) => {
      if (release.id === "draft") return;
      const member = memberId
        ? (organization.members.find((m) => m.user.id === memberId)?.user ??
          null)
        : null;
      await runWithToast(
        "update-release-lead",
        {
          loading: { title: "Saving...", description: "Updating lead." },
          success: { title: "Lead updated", description: "" },
          error: { title: "Failed", description: "Could not update lead." },
        },
        () =>
          updateReleaseAction(
            organization.id,
            release.id,
            { leadId: memberId },
            sseClientId,
          ),
      );
      setRelease((prev) =>
        prev
          ? {
              ...prev,
              lead: member
                ? { id: member.id, name: member.name, image: member.image }
                : null,
            }
          : null,
      );
    },
    [release.id, organization, sseClientId, runWithToast, setRelease],
  );

  // ── Labels ────────────────────────────────────────────────────────

  const handleLabelToggle = useCallback(
    async (newIds: string[]) => {
      if (release.id === "draft") return;
      const prevIds = currentLabels.map((l) => l.id);
      // Added labels
      for (const id of newIds.filter((id) => !prevIds.includes(id))) {
        await addReleaseLabelAction(
          organization.id,
          release.id,
          id,
          sseClientId,
        );
      }
      // Removed labels
      for (const id of prevIds.filter((id) => !newIds.includes(id))) {
        await removeReleaseLabelAction(organization.id, release.id, id);
      }
      const nextLabels = orgLabels.filter((l) => newIds.includes(l.id));
      setRelease((prev) => (prev ? { ...prev, labels: nextLabels } : null));
    },
    [
      release.id,
      organization.id,
      sseClientId,
      currentLabels,
      orgLabels,
      setRelease,
    ],
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
                    <IconCalendarStats className="w-3 h-3" />
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
                    <IconCalendarCheck className="w-3 h-3" />
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
        {showField("publicPage") && (
          <a
            href={`https://${organization.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/releases/${release.slug}`}
          >
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "border-transparent! rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
              )}
            >
              <IconLink className="w-3 h-3" />
              Public page
            </Button>
          </a>
        )}

        {/* Lead */}
        {showField("lead") && (
          <div className="flex flex-col gap-1.5">
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="primary"
                    size="sm"
                    className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
                  >
                    {currentLead?.image ? (
                      <Avatar className="h-3 w-3">
                        <AvatarImage
                          src={ensureCdnUrl(currentLead.image)}
                          alt={currentLead.name}
                        />
                        <AvatarFallback className="text-xs">
                          {currentLead.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <IconUser className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span
                      className={
                        currentLead
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {currentLead ? getDisplayName(currentLead) : "No lead"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {currentLead && (
                    <DropdownMenuItem
                      onClick={() => handleLeadChange(null)}
                      className="cursor-pointer text-muted-foreground"
                    >
                      No lead
                    </DropdownMenuItem>
                  )}
                  {organization.members.map((m) => (
                    <DropdownMenuItem
                      key={m.user.id}
                      onClick={() => handleLeadChange(m.user.id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-4 w-4 mr-2">
                        <AvatarImage
                          src={ensureCdnUrl(m.user.image ?? "")}
                          alt={m.user.name}
                        />
                        <AvatarFallback className="text-xs">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {getDisplayName(m.user)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span
                className={cn(
                  "text-xs flex items-center gap-1.5",
                  currentLead ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <IconUser className="w-3 h-3" />
                {currentLead ? getDisplayName(currentLead) : "No lead"}
              </span>
            )}
          </div>
        )}

        {/* Labels */}
        {showField("labels") && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1">
              {currentLabels.map((l) => (
                <RenderLabel
                  key={l.id}
                  label={l}
                  showRemove={editable}
                  onRemove={(id) =>
                    handleLabelToggle(
                      currentLabels.map((x) => x.id).filter((x) => x !== id),
                    )
                  }
                />
              ))}
              <ComboBox
                values={currentLabels.map((l) => l.id)}
                onValuesChange={handleLabelToggle}
              >
                <ComboBoxTrigger asChild disabled={!editable}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-6 w-6 aspect-square p-0 justify-center rounded-full"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                  </Button>
                </ComboBoxTrigger>
                <ComboBoxContent>
                  <ComboBoxSearch
                    placeholder="Search labels..."
                    onValueChange={setLabelSearch}
                  />
                  <ComboBoxList>
                    <ComboBoxEmpty className="p-0">
                      {canCreateLabel && labelSearch.trim().length > 0 ? (
                        <InlineCreateLabelForm
                          orgId={organization.id}
                          searchValue={labelSearch.trim()}
                          onCreated={(newLabels) => {
                            setLabelSearch("");
                            // Refresh org labels and add new label to release
                            const newLabel = newLabels[0];
                            if (newLabel) {
                              handleLabelToggle([
                                ...currentLabels.map((l) => l.id),
                                newLabel.id,
                              ]);
                            }
                          }}
                        />
                      ) : (
                        "No labels found."
                      )}
                    </ComboBoxEmpty>
                    <ComboBoxGroup>
                      {orgLabels.map((l) => (
                        <ComboBoxItem
                          key={l.id}
                          value={l.id}
                          searchValue={l.name}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: l.color ?? "#ccc" }}
                          />
                          <span className="ml-2">{l.name}</span>
                        </ComboBoxItem>
                      ))}
                    </ComboBoxGroup>
                  </ComboBoxList>
                </ComboBoxContent>
              </ComboBox>
            </div>
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
              <IconCalendarCheck className="h-3.5 w-3.5" />
              {release.releasedAt
                ? formatDate(release.releasedAt)
                : "Release date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 flex items-center gap-2 bg-accent">
              <Label variant={"subheading"}>Release date</Label>
              <Button
                variant="primary"
                size="sm"
                className={cn(
                  "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1 justify-start text-xs h-auto p-1 w-fit ml-auto",
                  !release.releasedAt && "invisible",
                )}
                onClick={() => handleReleasedAtChange(null)}
              >
                <IconX className="" />
                Clear
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={
                release.releasedAt ? new Date(release.releasedAt) : undefined
              }
              onSelect={(d) => handleReleasedAtChange(d)}
              className="bg-card"
            />
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
      {showField("publicPage") && (
        <a
          href={`https://${organization.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/releases/${release.slug}`}
        >
          <Button
            variant="primary"
            size="sm"
            className={cn(
              "w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2",
            )}
          >
            <IconLink className="h-3.5 w-3.5" />
            Public page
          </Button>
        </a>
      )}

      {showField("lead") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="primary"
              size="sm"
              className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2"
            >
              {currentLead?.image ? (
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage
                    src={ensureCdnUrl(currentLead.image)}
                    alt={currentLead.name}
                  />
                  <AvatarFallback className="text-xs">
                    {currentLead.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <IconUser className="h-3.5 w-3.5" />
              )}
              {currentLead ? getDisplayName(currentLead) : "Lead"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {currentLead && (
              <DropdownMenuItem
                onClick={() => handleLeadChange(null)}
                className="cursor-pointer text-muted-foreground"
              >
                No lead
              </DropdownMenuItem>
            )}
            {organization.members.map((m) => (
              <DropdownMenuItem
                key={m.user.id}
                onClick={() => handleLeadChange(m.user.id)}
                className="cursor-pointer"
              >
                <Avatar className="h-4 w-4 mr-2">
                  <AvatarImage
                    src={ensureCdnUrl(m.user.image ?? "")}
                    alt={m.user.name}
                  />
                  <AvatarFallback className="text-xs">
                    {m.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {getDisplayName(m.user)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showField("labels") && (
        <ComboBox
          values={currentLabels.map((l) => l.id)}
          onValuesChange={handleLabelToggle}
        >
          <ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
            <ComboBoxValue placeholder="Labels">
              <div className="flex items-center gap-1.5">
                <IconTag className="h-3.5 w-3.5" />
                <span>
                  {currentLabels.length > 0
                    ? `${currentLabels.length} label${currentLabels.length === 1 ? "" : "s"}`
                    : "Labels"}
                </span>
              </div>
            </ComboBoxValue>
            <ComboBoxIcon />
          </ComboBoxTrigger>
          <ComboBoxContent>
            <ComboBoxSearch placeholder="Search labels..." />
            <ComboBoxList>
              <ComboBoxEmpty>No labels found</ComboBoxEmpty>
              <ComboBoxGroup>
                {orgLabels.map((l) => (
                  <ComboBoxItem key={l.id} value={l.id} searchValue={l.name}>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: l.color ?? "#ccc" }}
                    />
                    <span className="ml-2">{l.name}</span>
                  </ComboBoxItem>
                ))}
              </ComboBoxGroup>
            </ComboBoxList>
          </ComboBoxContent>
        </ComboBox>
      )}
    </div>
  );
}
