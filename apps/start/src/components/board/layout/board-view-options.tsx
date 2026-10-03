import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Switch } from "@repo/ui/components/switch";
import OptionField from "@repo/ui/components/tomui/option-field";
import { cn } from "@repo/ui/lib/utils";
import {
  IconAdjustmentsHorizontal,
  IconArrowsSort,
  IconCheck,
  IconEyeOff,
  IconLayoutRows,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  TASK_GROUPING_OPTIONS,
  TASK_GROUPINGS,
} from "../config/grouping-options";
import { TASK_SORT_FIELDS, type TaskSortField } from "../filter/sort-config";
import { useBoardViewState } from "../filter/use-board-view-state";
import type { TaskGroupingId } from "../filter/types";
import { isPersistedViewMode } from "../core/view-config";
import { getViewOptionVisibility } from "../views/view-registry-model";
import { useActiveBoardView, useBoardViews } from "../views/view-registry";

/**
 * Board's own view-options popover — same structure/behavior as the existing
 * org-page TaskViewDropdown (read as a reference, not imported: view mode,
 * group by, sub-group by, sort by + direction, show completed toggle), but
 * driven by useBoardViewState() and board's own TASK_GROUPING_OPTIONS/
 * TASK_SORT_FIELDS so it works across every org in the lander, not one.
 */
export function BoardViewOptions() {
  const {
    grouping,
    subGrouping,
    showCompletedTasks,
    sortBy,
    sortDirection,
    setGrouping,
    setSubGrouping,
    setShowCompletedTasks,
    setViewMode,
    setSortBy,
    setSortDirection,
  } = useBoardViewState();

  const activeGrouping = TASK_GROUPINGS[grouping] ?? TASK_GROUPINGS.status;
  const activeSubGrouping =
    subGrouping && subGrouping !== "none" ? TASK_GROUPINGS[subGrouping] : null;
  const activeSortField =
    sortBy !== "none" ? TASK_SORT_FIELDS.find((f) => f.id === sortBy) : null;

  // The views the page registered (icon + label come from the registry) and which of the controls
  // below the active one supports.
  const views = useBoardViews();
  const activeView = useActiveBoardView();
  const { showViewPicker, showGrouping, showSubGrouping, showSort } =
    getViewOptionVisibility(views, activeView);

  const groupingOptions = useMemo(() => TASK_GROUPING_OPTIONS, []);

  const subGroupingOptions = useMemo(
    () => [
      {
        id: "none" as const,
        label: "None",
        icon: <IconEyeOff className="h-4 w-4" />,
      },
      ...TASK_GROUPING_OPTIONS.filter((opt) => opt.id !== grouping),
    ],
    [grouping],
  );

  // Only persistable view ids can be stored in the view state (a page-local view id never is).
  const selectView = (id: string) => {
    if (isPersistedViewMode(id)) setViewMode(id);
  };

  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [isGroupingMenuOpen, setIsGroupingMenuOpen] = useState(false);
  const [isSubGroupingMenuOpen, setIsSubGroupingMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  return (
    <Popover open={isViewOptionsOpen} onOpenChange={setIsViewOptionsOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={isViewOptionsOpen ? "secondary" : "ghost"}
            size={"sm"}
            className={cn("gap-2 h-6 w-6 p-1")}
          >
            <IconAdjustmentsHorizontal className="w-4 h-4" />
            {/*<span className="text-xs">View</span>*/}
          </Button>
        }
      />
      <PopoverContent
        className="max-w-96 flex flex-col gap-3"
        initialFocus={false}
        align="end"
      >
        {showViewPicker && (
          <RadioGroup
            value={activeView.id}
            className="flex items-center gap-2"
            onValueChange={(value) => {
              if (typeof value === "string") selectView(value);
            }}
          >
            {views.map((option) => (
              <Button
                key={option.id}
                variant={activeView.id === option.id ? "secondary" : "ghost"}
                onClick={() => selectView(option.id)}
                size={"sm"}
                className={"rounded-xl h-auto py-1 justify-start"}
              >
                {/*<Label
                key={option.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  activeViewMode === option.id && "border-primary/50 bg-accent",
                )}
              >
                <RadioGroupItem value={option.id} className="sr-only" />
                <div className="flex items-center gap-1">
                  {option.icon}
                  <span className="cursor-pointer text-sm font-semibold">
                    {option.label}
                  </span>
                </div>
              </Label>*/}
                <RadioGroupItem value={option.id} className="sr-only" />
                {option.icon} {option.label}
              </Button>
            ))}
          </RadioGroup>
        )}
        {showGrouping && (
          <OptionField
            title="Group by"
            titleClassName="text-xs text-muted-foreground"
            titleWrapper="gap-1"
            icon={<IconLayoutRows className="size-3" />}
            customSide={
              <DropdownMenu
                open={isGroupingMenuOpen}
                onOpenChange={setIsGroupingMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      size={"sm"}
                      className={
                        "rounded-xl h-auto p-1 px-2 justify-start border gap-1"
                      }
                      variant={isGroupingMenuOpen ? "secondary" : "accent"}
                    >
                      {activeGrouping.icon}
                      <span className="text-xs">{activeGrouping.label}</span>
                    </Button>
                  }
                />
                <DropdownMenuContent className="w-64" side="bottom" align="end">
                  <DropdownMenuRadioGroup
                    value={grouping}
                    onValueChange={(value) =>
                      setGrouping(value as TaskGroupingId)
                    }
                  >
                    {groupingOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.id}
                        value={option.id}
                        className="pl-8"
                      >
                        <span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
                          {option.icon}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            grouping === option.id &&
                              "font-semibold text-foreground",
                          )}
                        >
                          {option.label}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        )}
        {showSubGrouping && (
          <OptionField
            title="Sub-grouping"
            titleClassName="text-xs text-muted-foreground"
            titleWrapper="gap-1"
            icon={<IconLayoutRows className="size-3" />}
            customSide={
              <DropdownMenu
                open={isSubGroupingMenuOpen}
                onOpenChange={setIsSubGroupingMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      size={"sm"}
                      className={
                        "rounded-xl h-auto p-1 px-2 justify-start border gap-1"
                      }
                      variant={isSubGroupingMenuOpen ? "secondary" : "accent"}
                    >
                      {activeSubGrouping ? (
                        activeSubGrouping.icon
                      ) : (
                        <IconEyeOff className="h-4 w-4" />
                      )}
                      <span className="text-xs">
                        {activeSubGrouping ? activeSubGrouping.label : "None"}
                      </span>
                    </Button>
                  }
                />
                <DropdownMenuContent className="w-64" side="bottom" align="end">
                  <DropdownMenuRadioGroup
                    value={subGrouping ?? "none"}
                    onValueChange={(value) =>
                      setSubGrouping(value as TaskGroupingId | "none")
                    }
                  >
                    {subGroupingOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.id}
                        value={option.id}
                        className="pl-8"
                      >
                        <span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
                          {option.icon}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            option.id === subGrouping &&
                              "text-foreground font-medium",
                          )}
                        >
                          {option.label}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        )}
        {showSort && (
          <OptionField
            title="Sort by"
            titleClassName="text-xs text-muted-foreground"
            titleWrapper="gap-1"
            icon={<IconArrowsSort className="size-3 text-muted-foreground" />}
            customSide={
              <div className="flex items-center gap-1">
                <DropdownMenu
                  open={isSortMenuOpen}
                  onOpenChange={setIsSortMenuOpen}
                >
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size={"sm"}
                        className={
                          "rounded-xl h-auto p-1 px-2 justify-start border gap-1"
                        }
                        variant={isSortMenuOpen ? "secondary" : "accent"}
                      >
                        <span className="text-xs">
                          {activeSortField ? activeSortField.label : "None"}
                        </span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent
                    className="w-64"
                    side="bottom"
                    align="end"
                  >
                    <DropdownMenuRadioGroup
                      value={sortBy ?? "none"}
                      onValueChange={(value) =>
                        setSortBy(value as TaskSortField | "none")
                      }
                    >
                      <DropdownMenuRadioItem value="none" className="pl-8">
                        <span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
                          <IconEyeOff className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            (sortBy ?? "none") === "none" &&
                              "font-semibold text-foreground",
                          )}
                        >
                          None
                        </span>
                      </DropdownMenuRadioItem>
                      {TASK_SORT_FIELDS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                          className="pl-8"
                        >
                          <span
                            className={cn(
                              "text-sm",
                              sortBy === option.id &&
                                "font-semibold text-foreground",
                            )}
                          >
                            {option.label}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                {sortBy && sortBy !== "none" && (
                  <Button
                    type="button"
                    variant="accent"
                    size="icon"
                    className="border-transparent size-7"
                    onClick={() =>
                      setSortDirection(
                        sortDirection === "desc" ? "asc" : "desc",
                      )
                    }
                  >
                    {sortDirection === "desc" ? (
                      <IconSortDescending className="h-4 w-4" />
                    ) : (
                      <IconSortAscending className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            }
          />
        )}
        <OptionField
          title="Show completed tasks"
          titleClassName="text-xs text-muted-foreground"
          titleWrapper="gap-1"
          icon={<IconCheck className="size-3" />}
          customSide={
            <Switch
              checked={showCompletedTasks}
              onCheckedChange={(checked) =>
                setShowCompletedTasks(Boolean(checked))
              }
            />
          }
        />
      </PopoverContent>
    </Popover>
  );
}
