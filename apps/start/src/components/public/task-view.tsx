import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";
import { Board } from "@/components/board/board";
import {
  type BoardDataSource,
  BoardProvider,
} from "@/components/board/core/board-data";
import { BoardFooter } from "@/components/board/views/board-load-more";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { BoardTab } from "@/lib/portal/board-filters";
import {
  BoardEmptyState,
  BoardErrorState,
  BoardNoActiveState,
  BoardNoResultsState,
} from "./portal/board/BoardStates";
import { newPostLink } from "./portal/board/new-post-path";
import {
  PUBLIC_BOARD_CAPABILITIES,
  PUBLIC_BOARD_RENDERERS,
  PUBLIC_BOARD_SCOPE,
  PUBLIC_BOARD_VIEWS,
} from "./portal/board/public-board-config";
import {
  PublicPostsContext,
  type PublicPostsContextValue,
} from "./portal/board/public-posts-context";
import type { PublicReleaseSummary } from "./portal/board/useBoardSideData";
import { PORTAL_BODY } from "./portal/ui/column";
import { ListContainer } from "./portal/ui/ListContainer";
import { portalButtonVariants } from "./portal/ui/PortalButton";
import { RowSkeletonList } from "./portal/ui/RowSkeleton";
import { usePublicPostAbility } from "./public-task-creator";

/** `BoardDataSource.releases` holds full release rows; the public ones are summaries and travel in `PublicPostsContext`. */
const NO_RELEASE_ROWS: BoardDataSource["releases"] = [];

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
  const postsContext = useMemo<PublicPostsContextValue>(
    () => ({ releasesById }),
    [releasesById],
  );

  const showSkeleton = isLoading || (tasks.length === 0 && isFetchingMore);
  const showError = isError && tasks.length === 0 && !isLoading;

  return (
    <BoardProvider
      data={data}
      capabilities={PUBLIC_BOARD_CAPABILITIES}
      scope={PUBLIC_BOARD_SCOPE}
      theme="portal"
      views={PUBLIC_BOARD_VIEWS}
      renderers={PUBLIC_BOARD_RENDERERS}
    >
      <PublicPostsContext.Provider value={postsContext}>
        {/* The column reflows when the right panel pushes the page. */}
        <div className={cn(PORTAL_BODY, "pt-5 pb-16 md:pt-6 mx-0")}>
          <section className="min-w-0">
            {/* Below 1024px the panel is a sheet that never opens by itself: this goes straight to the form. */}
            {canPost && (
              <Link
                {...newPostLink(organization.slug)}
                className={cn(
                  portalButtonVariants({ variant: "primary", size: "lg" }),
                  "mb-5 h-12 w-full lg:hidden",
                )}
              >
                <IconPlus aria-hidden />
                Share an idea or report a bug
              </Link>
            )}

            {showError ? (
              <BoardErrorState onRetry={onRetry} />
            ) : showSkeleton ? (
              <>
                <RowSkeletonList />
                <BoardFooter />
              </>
            ) : tasks.length === 0 ? (
              <>
                <ListContainer>
                  {boardIsEmpty ? (
                    <BoardEmptyState
                      orgSlug={organization.slug}
                      canPost={canPost}
                    />
                  ) : tab === "active" && !hasActiveFilters ? (
                    <BoardNoActiveState onShowAll={() => onShowAll()} />
                  ) : (
                    <BoardNoResultsState
                      tabLabel={
                        tab === "done"
                          ? "Done"
                          : tab === "all"
                            ? "All"
                            : "Active"
                      }
                      onClear={hasActiveFilters ? onClearFilters : undefined}
                    />
                  )}
                </ListContainer>
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
