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
  IconCategory,
  IconFilter,
  IconLayoutKanban,
} from "@tabler/icons-react";
import { useState } from "react";
import { STATUS_CONFIG } from "@/components/board/config/field-config";
import { LabelBadge } from "@/components/board/fields/label-badge";
import RenderIcon from "@/components/generic/RenderIcon";
import type { BoardSort } from "@/lib/portal/board-filters";
import { getPortalStatus } from "@/lib/portal/status";

/**
 * Menu option look: no radio dot or check mark (the item's own indicator span is hidden); the chosen options are
 * highlighted instead.
 */
const OPTION_CLASS =
  "gap-2 rounded-lg pl-2 [&>span:first-child]:hidden data-checked:bg-secondary data-checked:font-medium data-checked:text-foreground";

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

/** How the board shows its posts: the list, or the roadmap kanban (`?layout=roadmap`). */
export type BoardLayout = "list" | "roadmap";

export interface BoardToolbarProps {
  layout: BoardLayout;
  onLayoutChange: (layout: BoardLayout) => void;
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

interface BoardControlsProps {
  toolbar: BoardToolbarProps;
}

/**
 * The board's control row, at the bottom of `BoardFeedbackCard`. List: the sort options as underlined tabs on the left
 * (Most voted / Newest / Recently updated). Roadmap: a short note there instead (its columns have their own order).
 * On the right, the filter menu (no status section on the roadmap, whose columns are the statuses) and the Roadmap
 * toggle. Everything is driven by `toolbar` (built fresh by the page on every render, so changes always reach the row).
 */
export function BoardControls({ toolbar }: BoardControlsProps) {
  const {
    layout,
    onLayoutChange,
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isRoadmap = layout === "roadmap";

  // The roadmap's columns are the statuses, so it has no status filter.
  const statusOptions = isRoadmap ? [] : STATUS_ORDER;
  const activeFilterCount =
    (categorySlug ? 1 : 0) +
    labelIds.length +
    (isRoadmap ? 0 : statuses.length);
  const hasFilterMenu =
    statusOptions.length > 0 || categories.length > 0 || labels.length > 0;

  return (
    <div className="flex h-10 items-center gap-2 px-1">
      {isRoadmap ? (
        <span className="min-w-0 flex-1 truncate px-2 text-muted-foreground text-xs">
          Planned, in progress and recently shipped
        </span>
      ) : (
        <Tabs
          value={sort}
          onValueChange={(value) => onSortChange(value as BoardSort)}
          className="min-w-0 flex-1 gap-0 self-stretch"
        >
          <TabsList
            variant="underline"
            aria-label="Sort posts"
            // The indicator sits inside the strip (not 1px below it) so the scroll container doesn't clip it.
            className="w-full flex-1 items-stretch justify-start gap-1 overflow-x-auto data-[orientation=horizontal]:py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden *:data-[slot=tabs-trigger]:hover:bg-transparent **:data-[slot=tab-indicator]:translate-y-0!"
          >
            {(Object.keys(SORT_LABELS) as BoardSort[]).map((value) => (
              <TabsTab
                key={value}
                value={value}
                className="h-auto shrink-0 grow-0 gap-2 rounded-none px-2.5 text-muted-foreground text-sm hover:text-foreground focus-visible:ring-0 data-active:text-foreground sm:h-auto md:px-3"
              >
                {SORT_LABELS[value]}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
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
                      className={OPTION_CLASS}
                    >
                      {STATUS_CONFIG[status].icon("size-3.5 shrink-0")}
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
                    <DropdownMenuRadioItem value="" className={OPTION_CLASS}>
                      <IconCategory
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      All categories
                    </DropdownMenuRadioItem>
                    {categories.map((category) => (
                      <DropdownMenuRadioItem
                        key={category.id}
                        value={generateSlug(category.name)}
                        className={OPTION_CLASS}
                      >
                        <span
                          className="flex shrink-0"
                          style={{ color: category.color ?? undefined }}
                        >
                          <RenderIcon
                            iconName={category.icon || "IconCategory"}
                            size={14}
                            raw
                            color={category.color ?? undefined}
                          />
                        </span>
                        <span className="truncate">{category.name}</span>
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
                      className={OPTION_CLASS}
                    >
                      <LabelBadge label={label} />
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
          variant={isRoadmap ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={isRoadmap}
          tooltipText={isRoadmap ? "Back to the list" : "What's planned, in progress and shipped"}
          tooltipSide="bottom"
          className="h-6 gap-2 px-2 max-md:w-6 max-md:p-1"
          onClick={() => onLayoutChange(isRoadmap ? "list" : "roadmap")}
        >
          <IconLayoutKanban aria-hidden className="size-3.5" />
          <span className="max-md:sr-only">Roadmap</span>
        </Button>
      </div>
    </div>
  );
}
