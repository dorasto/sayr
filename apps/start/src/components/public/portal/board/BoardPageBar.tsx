import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTab } from "@repo/ui/components/cossui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { generateSlug } from "@repo/util";
import {
  IconChevronDown,
  IconFilter,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconSortDescending,
} from "@tabler/icons-react";
import { useState } from "react";
import { usePage, usePanel } from "@/components/generic/use-page";
import {
  type BoardSort,
  type BoardTab,
  getTabStatuses,
} from "@/lib/portal/board-filters";
import { getPortalStatus } from "@/lib/portal/status";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PUBLIC_BOARD_PANEL_ID } from "./BoardRailContent";

const SORT_LABELS: Record<BoardSort, string> = {
  mostPopular: "Most voted",
  newest: "Newest",
  updated: "Recently updated",
};

const STATUS_ORDER = [
  "backlog",
  "todo",
  "in-progress",
  "done",
  "canceled",
] as const;

const TABS: ReadonlyArray<{ value: BoardTab; label: string }> = [
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

export interface BoardToolbarProps {
  tab: BoardTab;
  onTabChange: (tab: BoardTab) => void;
  /** Tab counts; a missing entry means the count is not exact yet and is hidden. */
  counts: Partial<Record<BoardTab, number>>;
  sort: BoardSort;
  onSortChange: (sort: BoardSort) => void;
  categories: ReadonlyArray<schema.categoryType>;
  categorySlug: string | null;
  onCategoryChange: (slug: string | null) => void;
  labels: ReadonlyArray<schema.labelType>;
  labelIds: ReadonlyArray<string>;
  onLabelToggle: (labelId: string) => void;
  statuses: ReadonlyArray<string>;
  onStatusToggle: (status: string) => void;
  onClearFilters: () => void;
}

interface BoardPageBarProps {
  toolbar: BoardToolbarProps;
}

/**
 * The board's top bar (the Page `header`, h-11 on desktop, h-14 on phones): the tabs on the left (Active / Done / All
 * with counts; the bar's own bottom border is their underline track), then the sort and filter menus (icon-only on
 * phones) and the toggle that hides and shows the right-hand panel. The toggle is how a closed panel comes back, and
 * how the panel is opened below 1024px, where it never opens by itself. Everything is driven by `toolbar` (built fresh
 * by the page on every render, so tab, sort, filter and count changes always reach the bar).
 */
export function BoardPageBar({ toolbar }: BoardPageBarProps) {
  const {
    tab,
    onTabChange,
    counts,
    sort,
    onSortChange,
    categories,
    categorySlug,
    onCategoryChange,
    labels,
    labelIds,
    onLabelToggle,
    statuses,
    onStatusToggle,
    onClearFilters,
  } = toolbar;
  const panel = usePanel(PUBLIC_BOARD_PANEL_ID);
  const { closePanel } = usePage();
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Status filter only offers statuses that can appear under the current tab: Done has just one, and Won't do
  // (canceled) is only reachable under All.
  const tabStatuses = getTabStatuses(tab);
  const statusOptions =
    tab === "done"
      ? []
      : STATUS_ORDER.filter(
          (status) => !tabStatuses || tabStatuses.includes(status),
        );
  const activeFilterCount =
    (categorySlug ? 1 : 0) +
    labelIds.length +
    (tab === "done" ? 0 : statuses.length);
  const hasFilterMenu =
    statusOptions.length > 0 || categories.length > 0 || labels.length > 0;

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-border bg-background px-3 md:h-11">
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as BoardTab)}
        className="min-w-0 flex-1 gap-0 self-stretch"
      >
        <TabsList
          variant="underline"
          // The indicator sits inside the strip (not 1px below it) so the scroll container doesn't clip it.
          className="w-full flex-1 items-stretch justify-start gap-1 overflow-x-auto data-[orientation=horizontal]:py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden *:data-[slot=tabs-trigger]:hover:bg-transparent **:data-[slot=tab-indicator]:translate-y-0!"
        >
          {TABS.map((item) => (
            <TabsTab
              key={item.value}
              value={item.value}
              className="h-auto shrink-0 grow-0 gap-2 rounded-none px-2.5 text-muted-foreground text-sm hover:text-foreground focus-visible:ring-0 data-active:text-foreground sm:h-auto md:px-3"
            >
              {item.label}
              {counts[item.value] !== undefined && (
                <span className="font-medium text-muted-foreground text-xs tabular-nums">
                  {counts[item.value]}
                </span>
              )}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <DropdownMenu open={isSortOpen} onOpenChange={setIsSortOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant={isSortOpen ? "secondary" : "ghost"}
                size="sm"
                className="h-6 gap-2 px-2 max-md:w-6 max-md:p-1"
              />
            }
          >
            <IconSortDescending aria-hidden className="size-3.5" />
            <span className="max-md:sr-only">{SORT_LABELS[sort]}</span>
            <IconChevronDown aria-hidden className="size-3.5 max-md:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Sort by
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as BoardSort)}
            >
              {(Object.keys(SORT_LABELS) as BoardSort[]).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {SORT_LABELS[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilterMenu && (
          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant={
                    isFilterOpen || activeFilterCount > 0
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="h-6 gap-2 px-2 max-md:min-w-6 max-md:p-1"
                />
              }
            >
              <IconFilter aria-hidden className="size-3.5" />
              <span className="max-md:sr-only">Filter</span>
              {activeFilterCount > 0 && (
                <span className="tabular-nums">{activeFilterCount}</span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[min(70dvh,480px)] w-56"
            >
              {statusOptions.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Status
                  </DropdownMenuLabel>
                  {statusOptions.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statuses.includes(status)}
                      onCheckedChange={() => onStatusToggle(status)}
                    >
                      {getPortalStatus(status).label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {categories.length > 0 && (
                <>
                  {statusOptions.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Category
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={categorySlug ?? ""}
                    onValueChange={(value) => onCategoryChange(value || null)}
                  >
                    <DropdownMenuRadioItem value="">
                      All categories
                    </DropdownMenuRadioItem>
                    {categories.map((category) => (
                      <DropdownMenuRadioItem
                        key={category.id}
                        value={generateSlug(category.name)}
                      >
                        {category.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              )}

              {labels.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Label
                  </DropdownMenuLabel>
                  {labels.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label.id}
                      checked={labelIds.includes(label.id)}
                      onCheckedChange={() => onLabelToggle(label.id)}
                    >
                      {label.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="w-full rounded-xl px-2 py-1.5 text-left text-primary text-sm hover:bg-accent focus-visible:bg-accent"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          type="button"
          variant={panel.isOpen ? "secondary" : "ghost"}
          size="sm"
          aria-label={panel.isOpen ? "Hide panel" : "Show panel"}
          aria-pressed={panel.isOpen}
          className="h-6 w-6 shrink-0 gap-2 p-1"
          onClick={() =>
            panel.isOpen
              ? closePanel(PUBLIC_BOARD_PANEL_ID)
              : sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true)
          }
        >
          {panel.isOpen ? (
            <IconLayoutSidebarRightFilled />
          ) : (
            <IconLayoutSidebarRight />
          )}
        </Button>
      </div>
    </div>
  );
}
