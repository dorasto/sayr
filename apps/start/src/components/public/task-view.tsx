import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import {
  IconAlertTriangle,
  IconBulb,
  IconFilterOff,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { Board } from "@/components/board/board";
import {
  type BoardDataSource,
  BoardProvider,
} from "@/components/board/core/board-data";
import type { TaskItem } from "@/components/board/core/board-item";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope-config";
import {
  DEFAULT_FILTER_STATE,
  pageLocalGrouping,
} from "@/components/board/core/view-config";
import {
  DEFAULT_TASK_VIEW_STATE,
  type TaskViewCombinedState,
} from "@/components/board/filter/types";
import { BoardListView } from "@/components/board/views/board-list-view";
import { BoardFooter } from "@/components/board/views/board-load-more";
import { LIST_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { BoardTab } from "@/lib/portal/board-filters";
import { newPostLink } from "./portal/board/new-post-path";
import type { PublicReleaseSummary } from "./portal/board/useBoardSideData";
import { usePublicPostAbility } from "./public-task-creator";
import { PublicBoardRow, PublicPostsContext } from "./task-item";

// What the public Feedback board hands `BoardProvider`, as module-level constants (the provider wants stable
// identities). The component below supplies only the data.

/** `BoardDataSource.releases` holds full release rows; the public ones are summaries and travel in `PublicPostsContext`. */
const NO_RELEASE_ROWS: BoardDataSource["releases"] = [];

/** The public board never edits, selects, drags or saves views. */
const PUBLIC_BOARD_CAPABILITIES = READ_ONLY_CAPABILITIES;

function PublicListViewAdapter({ items }: { items: readonly TaskItem[] }) {
  // The public endpoint is ranked server-side: a post whose parent is also loaded stays in its own ranked slot.
  return <BoardListView tasks={items} flatSubtasks />;
}

/** The Feedback board is list-only: the board's read-only list, every post a flat top-level row. */
const PUBLIC_BOARD_VIEWS: readonly BoardViewDefinition[] = [
  {
    ...LIST_VIEW,
    component: PublicListViewAdapter,
    supports: { ...LIST_VIEW.supports, drag: false, subtasks: "flat" },
  },
];

/** The bordered shell around the list's rows (rows draw their own top divider). */
function PublicListShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
  );
}

/** Row = `PublicBoardRow`; the footer is the board's own "Show more posts" button (the label comes from the data source). */
const PUBLIC_BOARD_RENDERERS: BoardRenderers = {
  row: PublicBoardRow,
  listContainer: PublicListShell,
};

/** One stable scope: controlled, list view, no grouping, completed posts shown, no board-side sort. */
const PUBLIC_BOARD_SCOPE: BoardScope = (() => {
  // The host (the page's toolbar) owns what is shown; the board only reads this state, so changes are ignored.
  const state: TaskViewCombinedState = {
    filters: DEFAULT_FILTER_STATE,
    viewConfig: {
      ...DEFAULT_TASK_VIEW_STATE,
      grouping: pageLocalGrouping("none"),
      subGrouping: "none",
      showCompletedTasks: true,
      sortBy: "none",
      viewMode: "list",
    },
  };
  return {
    key: "public-board",
    persistence: "controlled",
    initial: state.viewConfig,
    controlled: { state, onChange: () => {} },
  };
})();

const SKELETON_TITLE_WIDTHS = ["62%", "48%", "70%"];

interface EmptyStateProps {
  icon: ReactNode;
  /** `accent` (primary tile) for the first-run "be the first" state, `neutral` otherwise. */
  accent?: boolean;
  title: string;
  description: string;
  actions?: ReactNode;
}

/** Centered empty/no-results state: icon tile, title, description and an optional action. */
function EmptyState({
  icon,
  accent = false,
  title,
  description,
  actions,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-[340px] flex-col items-center py-14 text-center">
      <span
        aria-hidden
        className={cn(
          "mb-3.5 inline-flex size-12 items-center justify-center rounded-xl",
          accent
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="font-semibold text-base">{title}</div>
      <p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
        {description}
      </p>
      {actions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface PublicTaskViewProps {
  /** The active tab (the tabs themselves live in the page bar); picks the empty / no-results state. */
  tab: BoardTab;
  /** Posts to show: already tab/filter/sort applied. */
  tasks: ReadonlyArray<schema.TaskWithLabels>;
  releasesById: ReadonlyMap<string, PublicReleaseSummary>;
  isLoading: boolean;
  isError: boolean;
  /** More posts are being fetched (by "Show more posts" or while filters leave too few visible). */
  isFetchingMore: boolean;
  hasMore: boolean;
  hasActiveFilters: boolean;
  /** The org has no public posts at all (only known from the All tab; Active's total is open-only). */
  boardIsEmpty: boolean;
  onShowMore: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
  /** "Show all" from the no-active-posts state: switch to the All tab. */
  onShowAll: () => void;
}

/**
 * The board's main column: the posts as a list, rendered by the shared board system (`<Board />` on a read-only,
 * controlled, "portal"-themed `BoardProvider`). The page owns tabs, sort and filters (their controls are in the
 * page's top bar, `BoardPageBar`) and hands the board the visible posts in order (`passthrough`), so the board never
 * re-filters or re-sorts the server-ranked pages. The composer, categories and latest release live in the board's right-hand
 * panel (`BoardRailPanel`), not here.
 */
export function PublicTaskView({
  tab,
  tasks,
  releasesById,
  isLoading,
  isError,
  isFetchingMore,
  hasMore,
  hasActiveFilters,
  boardIsEmpty,
  onShowMore,
  onRetry,
  onClearFilters,
  onShowAll,
}: PublicTaskViewProps) {
  const { organization, categories, labels } = usePublicOrganizationLayout();
  const { canPost } = usePublicPostAbility();

  // A stable `loadMore` so the data source only changes when the posts or paging state do.
  const onShowMoreRef = useRef(onShowMore);
  onShowMoreRef.current = onShowMore;
  const loadMore = useCallback(() => onShowMoreRef.current(), []);

  const data = useMemo<BoardDataSource>(
    () => ({
      items: tasks,
      labels,
      categories,
      releases: NO_RELEASE_ROWS,
      passthrough: true,
      pagination: {
        hasMore,
        isFetchingMore,
        loadMore,
        loadMoreLabel: "Show more posts",
      },
    }),
    [tasks, labels, categories, hasMore, isFetchingMore, loadMore],
  );
  const postsContext = useMemo(() => ({ releasesById }), [releasesById]);

  const showSkeleton = isLoading || (tasks.length === 0 && isFetchingMore);
  const showError = isError && tasks.length === 0 && !isLoading;

  return (
    <BoardProvider
      data={data}
      capabilities={PUBLIC_BOARD_CAPABILITIES}
      scope={PUBLIC_BOARD_SCOPE}
      views={PUBLIC_BOARD_VIEWS}
      renderers={PUBLIC_BOARD_RENDERERS}
    >
      <PublicPostsContext.Provider value={postsContext}>
        {/* The column reflows when the right panel pushes the page. */}
        <div className="w-full px-4 pt-5 pb-16 md:pt-3">
          <section className="min-w-0">
            {/* Below 1024px the panel is a sheet that never opens by itself: this goes straight to the form. */}
            {canPost && (
              <Button
                render={<Link {...newPostLink(organization.slug)} />}
                nativeButton={false}
                size="lg"
                className="mb-5 h-12 w-full lg:hidden"
              >
                <IconPlus aria-hidden />
                Share an idea or report a bug
              </Button>
            )}

            {showError ? (
              <div
                role="alert"
                className="flex items-center gap-3.5 rounded-xl border border-destructive/50 bg-card px-[22px] py-5"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
                >
                  <IconAlertTriangle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15px]">
                    We could not load the board
                  </div>
                  <div className="text-[13.5px] text-muted-foreground">
                    Check your connection and try again.
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <IconRefresh aria-hidden />
                  Retry
                </Button>
              </div>
            ) : showSkeleton ? (
              <>
                <div
                  aria-busy
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  {SKELETON_TITLE_WIDTHS.map((width) => (
                    <div
                      key={width}
                      aria-hidden
                      className="flex gap-4 border-t p-5 first:border-t-0"
                    >
                      <Skeleton className="h-14 w-12 shrink-0 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="mb-3 h-4" style={{ width }} />
                        <Skeleton className="mb-2 h-3 w-[92%] opacity-70" />
                        <Skeleton className="h-3 w-3/5 opacity-70" />
                      </div>
                    </div>
                  ))}
                </div>
                <BoardFooter />
              </>
            ) : tasks.length === 0 ? (
              <>
                <PublicListShell>
                  {boardIsEmpty ? (
                    <EmptyState
                      accent
                      icon={<IconBulb className="size-6" />}
                      title="No posts yet"
                      description="Be the first to tell the team what you need."
                      actions={
                        canPost && (
                          <Button
                            render={
                              <Link {...newPostLink(organization.slug)} />
                            }
                            nativeButton={false}
                          >
                            <IconPlus aria-hidden />
                            Share an idea
                          </Button>
                        )
                      }
                    />
                  ) : tab === "active" && !hasActiveFilters ? (
                    <EmptyState
                      icon={<IconFilterOff className="size-6" />}
                      title="No active posts"
                      description="Nothing is open right now. Look under Done or All to see earlier posts."
                      actions={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onShowAll()}
                        >
                          Show all posts
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={<IconFilterOff className="size-6" />}
                      title={
                        hasActiveFilters
                          ? "No posts match these filters"
                          : `Nothing under ${tab === "done" ? "Done" : tab === "all" ? "All" : "Active"} yet`
                      }
                      description={
                        hasActiveFilters
                          ? "Try fewer filters, or clear them to see every post."
                          : "Posts show up here as they change status."
                      }
                      actions={
                        hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearFilters}
                          >
                            Clear filters
                          </Button>
                        )
                      }
                    />
                  )}
                </PublicListShell>
                {/* Filters can leave nothing visible while more pages exist: keep "Show more posts" reachable. */}
                <BoardFooter />
              </>
            ) : (
              // The board renders its own footer.
              <Board />
            )}
          </section>
        </div>
      </PublicPostsContext.Provider>
    </BoardProvider>
  );
}
