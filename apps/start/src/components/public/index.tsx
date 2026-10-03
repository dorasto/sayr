import { generateSlug } from "@repo/util";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Page, type PanelConfig } from "@/components/generic/page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import {
  boardListKey,
  updateBoardTasks,
  useBoardList,
} from "@/hooks/portal/useBoardList";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { usePublicVotes } from "@/hooks/portal/usePublicVotes";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  type BoardSort,
  type BoardTab,
  countByTab,
  filterBoardTasks,
  sortBoardTasks,
} from "@/lib/portal/board-filters";
import { parseCsvParam } from "@/lib/portal/board-row";
import type { ServerEventMessage } from "@/lib/serverEvents";
import {
  BoardPageBar,
  type BoardToolbarProps,
} from "./portal/board/BoardPageBar";
import { BoardPanelProvider } from "./portal/board/BoardPanelProvider";
import {
  PUBLIC_BOARD_PANEL_ID,
  RAIL_HEADER,
} from "./portal/board/BoardRailContent";
import { BoardRailProvider } from "./portal/board/BoardRailProvider";
import {
  boardCountsKey,
  useBoardCounts,
  useBoardReleases,
} from "./portal/board/useBoardSideData";
import { patchPeekPosts } from "./portal/peek/usePeekPost";
import { publicCommentsKey } from "./portal/post/usePostComments";
import { PublicTaskView } from "./task-view";

/** Below this many visible posts (after client-side filters) the next page is fetched automatically. */
const MIN_VISIBLE_POSTS = 10;
/** Cap on automatic follow-up pages per tab/sort/filter combination; after that the user presses "Show more posts". */
const MAX_AUTO_PAGES = 6;

const STATUS_VALUES = ["backlog", "todo", "in-progress", "done", "canceled"];

/**
 * The board's one right-hand panel. Open by default on desktop (the platform never auto-opens it below 768px, and
 * `usePanelViewportDefaults` closes it on load below 1024px), with the open state and a drag-resized width persisted
 * like any panel, so a user's close sticks. It shows the overview (composer, categories, latest release) until a post is
 * selected, then that post (Peek); `BoardPanelProvider` swaps the views and keeps `?task` in sync. `height` is the
 * phone sheet's height: tall enough for the composer and its similar posts.
 */
const BOARD_PANEL: PanelConfig = {
  id: PUBLIC_BOARD_PANEL_ID,
  // Fallback until the provider has put the overview header in the store.
  header: RAIL_HEADER,
  defaultOpen: true,
  persistOpenState: false,
  width: "40dvw",
  resizable: false,
  height: "70dvh",
  minWidth: 280,
  maxWidth: 720,
};

export default function PublicOrgHomePage() {
  const queryClient = useQueryClient();
  const {
    serverEvents,
    organization,
    categories,
    labels,
    setLabels,
    setCategories,
    setTasks,
  } = usePublicOrganizationLayout();
  const orgId = organization.id;

  const {
    tab: tabParam,
    sort: sortParam,
    category: categoryParam,
    status: statusParam,
    labels: labelsParam,
    setBoardParams,
  } = useTasksSearchParams();

  // URL state -> board state
  const tab: BoardTab =
    tabParam === "done" || tabParam === "all" ? tabParam : "active";
  const sort: BoardSort =
    sortParam === "newest" || sortParam === "updated"
      ? sortParam
      : "mostPopular";
  const category = useMemo(
    () =>
      categoryParam
        ? (categories.find((c) => generateSlug(c.name) === categoryParam) ??
          null)
        : null,
    [categories, categoryParam],
  );
  const statuses = useMemo(
    () =>
      parseCsvParam(statusParam).filter((status) =>
        STATUS_VALUES.includes(status),
      ),
    [statusParam],
  );
  const labelIds = useMemo(
    () =>
      parseCsvParam(labelsParam).filter((id) =>
        labels.some((label) => label.id === id),
      ),
    [labelsParam, labels],
  );

  const list = useBoardList({
    organizationId: orgId,
    // Active shows open posts only; Done and All also need the closed ones.
    includeClosed: tab !== "active",
    // "Recently updated" has no backend sort: it is applied to the loaded set below.
    sortBy: sort === "newest" ? "newest" : "mostPopular",
    categoryId: category?.id ?? null,
  });
  const { refetch: refetchVotes } = usePublicVotes(orgId);
  const countsQuery = useBoardCounts(orgId);
  const { releases } = useBoardReleases(organization.slug);
  // Modal and closed-on-load below 1024px (a sheet that never auto-opens); `undefined` (platform default) above.
  const { modal } = usePanelViewportDefaults(PUBLIC_BOARD_PANEL_ID);
  const panels = useMemo(() => ({ right: { ...BOARD_PANEL, modal } }), [modal]);

  // Keep the shared layout copy of the loaded posts in sync (the post page's related posts, parent/sub-task lookup and
  // mentions read it). Only the unfiltered set is written: a category, status or label view must not shrink it.
  const isUnfilteredSet =
    tab !== "done" &&
    !category &&
    statuses.length === 0 &&
    labelIds.length === 0 &&
    !list.isPlaceholderData;
  useEffect(() => {
    if (list.isLoading || !isUnfilteredSet) return;
    setTasks(list.tasks);
  }, [list.isLoading, isUnfilteredSet, list.tasks, setTasks]);

  // Realtime: patch the cached list in place so counts and rows update without a refetch or a scroll reset.
  const handlers: WSMessageHandler<ServerEventMessage> = {
    CREATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        queryClient.invalidateQueries({ queryKey: boardListKey(orgId) });
        queryClient.invalidateQueries({ queryKey: boardCountsKey(orgId) });
      }
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        setLabels(msg.data);
      }
    },
    UPDATE_TASK_VOTE: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        const { id, voteCount } = msg.data;
        updateBoardTasks(queryClient, orgId, (task) =>
          task.id === id && task.voteCount !== voteCount
            ? { ...task, voteCount }
            : task,
        );
        // A post opened in Peek by deep link is not in the list: keep its copy live too.
        patchPeekPosts(queryClient, orgId, (post) =>
          post.id === id && post.voteCount !== voteCount
            ? { ...post, voteCount }
            : post,
        );
        refetchVotes();
      }
    },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        setCategories(msg.data);
        queryClient.invalidateQueries({ queryKey: boardCountsKey(orgId) });
      }
    },
    UPDATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        const updated = msg.data;
        updateBoardTasks(queryClient, orgId, (task) =>
          task.id === updated.id ? { ...task, ...updated } : task,
        );
        patchPeekPosts(queryClient, orgId, (post) =>
          post.id === updated.id ? { ...post, ...updated } : post,
        );
        queryClient.invalidateQueries({ queryKey: boardCountsKey(orgId) });
      }
    },
    // Peek shows the open post's conversation and Latest update; refresh them like the post page does.
    UPDATE_TASK_COMMENTS: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
        const taskId = msg.data.id;
        void queryClient.invalidateQueries({
          queryKey: publicCommentsKey(taskId, orgId),
        });
        // The row's comment count comes from the list entry: refetch the list, but only when the post is in it.
        let inBoardList = false;
        updateBoardTasks(queryClient, orgId, (task) => {
          if (task.id === taskId) inBoardList = true;
          return task;
        });
        if (inBoardList)
          void queryClient.invalidateQueries({ queryKey: boardListKey(orgId) });
      }
    },
  };
  const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);
  useEffect(() => {
    if (!serverEvents.event) return;
    serverEvents.event.addEventListener("message", handleMessage);
    return () => {
      serverEvents.event?.removeEventListener("message", handleMessage);
    };
  }, [serverEvents.event, handleMessage]);

  // Client-side tab/status/label filters over the loaded set. Server order is kept for Most voted / Newest.
  const visibleTasks = useMemo(() => {
    const filtered = filterBoardTasks(list.tasks, {
      tab,
      categoryId: category?.id ?? null,
      labelIds,
      statuses,
    });
    return sort === "updated" ? sortBoardTasks(filtered, "updated") : filtered;
  }, [list.tasks, tab, category, labelIds, statuses, sort]);

  // Filters are applied after paging, so a page can add few visible posts: keep loading (a bounded number of pages)
  // until there is enough to show.
  const filterKey = [
    tab,
    sort,
    category?.id ?? "",
    statuses.join(),
    labelIds.join(),
  ].join("|");
  const autoPages = useRef({ key: filterKey, count: 0 });
  const { hasNextPage, fetchNextPage } = list;
  useEffect(() => {
    if (autoPages.current.key !== filterKey)
      autoPages.current = { key: filterKey, count: 0 };
    if (
      list.isLoading ||
      list.isFetching ||
      list.isPlaceholderData ||
      !hasNextPage
    )
      return;
    if (
      visibleTasks.length >= MIN_VISIBLE_POSTS ||
      autoPages.current.count >= MAX_AUTO_PAGES
    )
      return;
    autoPages.current.count += 1;
    void fetchNextPage();
  }, [
    filterKey,
    list.isLoading,
    list.isFetching,
    list.isPlaceholderData,
    hasNextPage,
    visibleTasks.length,
    fetchNextPage,
  ]);

  // Tab counts: Active is exact from the counts endpoint. Done / All are only exact once every closed-mode page is
  // loaded (the backend has no status filter), so they are hidden until then and whenever a category narrows the set.
  const closedLoaded =
    tab !== "active" &&
    !category &&
    !list.hasNextPage &&
    !list.isPlaceholderData &&
    !list.isLoading;
  const loadedCounts = closedLoaded ? countByTab(list.tasks) : null;
  const tabCounts: Partial<Record<BoardTab, number>> = {
    active: countsQuery.data?.open,
    done: loadedCounts?.done,
    all: loadedCounts?.all,
  };

  const hasActiveFilters =
    !!category ||
    labelIds.length > 0 ||
    (tab !== "done" && statuses.length > 0);

  const setCsv = (current: string[], value: string): string | null => {
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    return next.length > 0 ? next.join(",") : null;
  };

  const clearFilters = useCallback(
    () => setBoardParams({ status: null, labels: null, category: null }),
    [setBoardParams],
  );
  const setCategorySlug = useCallback(
    (slug: string | null) => setBoardParams({ category: slug }),
    [setBoardParams],
  );
  const categorySlug = category ? generateSlug(category.name) : null;

  // The tabs, sort and filter menus live in the Page's top bar. Built on every render (no memo, no module constant)
  // so a tab, sort, filter or count change always reaches the bar instead of a stale element.
  const toolbar: BoardToolbarProps = {
    tab,
    onTabChange: (next) =>
      setBoardParams({ tab: next === "active" ? null : next, status: null }),
    counts: tabCounts,
    sort,
    onSortChange: (next) =>
      setBoardParams({ sort: next === "mostPopular" ? null : next }),
    categories,
    categorySlug,
    onCategoryChange: setCategorySlug,
    labels,
    labelIds,
    onLabelToggle: (id) => setBoardParams({ labels: setCsv(labelIds, id) }),
    statuses,
    onStatusToggle: (status) =>
      setBoardParams({ status: setCsv(statuses, status) }),
    onClearFilters: clearFilters,
  };

  return (
    <BoardRailProvider
      releases={releases}
      counts={countsQuery.data}
      activeCategorySlug={categorySlug}
      onCategoryChange={setCategorySlug}
    >
      <BoardPanelProvider tasks={list.tasks}>
        <Page
          header={<BoardPageBar toolbar={toolbar} />}
          panels={panels}
          className=""
        >
          <PublicTaskView
            tab={tab}
            tasks={visibleTasks}
            isLoading={list.isLoading}
            isError={list.isError}
            isFetchingMore={
              list.isFetchingNextPage ||
              list.isPlaceholderData ||
              (list.isFetching && visibleTasks.length === 0)
            }
            hasMore={!!list.hasNextPage}
            hasActiveFilters={hasActiveFilters}
            // Only the All tab's total counts every post; Active's is open-only, so an empty Active is not an empty board.
            boardIsEmpty={
              !hasActiveFilters &&
              tab === "all" &&
              !list.isPlaceholderData &&
              list.totalItems === 0
            }
            onShowMore={() => void list.fetchNextPage()}
            onRetry={() => void list.refetch()}
            onClearFilters={clearFilters}
            onShowAll={() => setBoardParams({ tab: "all", status: null })}
          />
        </Page>
      </BoardPanelProvider>
    </BoardRailProvider>
  );
}
