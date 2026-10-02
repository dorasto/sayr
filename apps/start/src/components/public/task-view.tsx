import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { IconAlertTriangle, IconPlus, IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";
import { Board } from "@/components/board/board";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope-config";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import { DEFAULT_TASK_VIEW_STATE } from "@/components/board/filter/types";
import { BoardFooter } from "@/components/board/views/board-load-more";
import { FLAT_LIST_VIEW } from "@/components/board/views/view-registry";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { BoardTab } from "@/lib/portal/board-filters";
import { BoardEmptyState } from "./portal/board/BoardEmptyState";
import { newPostLink } from "./portal/board/new-post-path";
import { usePublicPostAbility } from "./public-task-creator";
import { PublicTaskItem } from "./task-item";

// Everything `BoardProvider` gets besides the data is a module-level constant (the provider wants stable identities).

/** The Feedback board is list-only, every post a flat row in the server's ranked order. */
const PUBLIC_BOARD_VIEWS = [FLAT_LIST_VIEW];

const PUBLIC_BOARD_RENDERERS: BoardRenderers = { row: PublicTaskItem };

/** Controlled and read-only: the page bar owns tabs, sort and filters, so the board shows posts as given. */
const PUBLIC_BOARD_SCOPE: BoardScope = {
	key: "public-board",
	persistence: "controlled",
	initial: { ...DEFAULT_TASK_VIEW_STATE, grouping: pageLocalGrouping("none"), showCompletedTasks: true },
	controlled: {
		state: {
			filters: DEFAULT_FILTER_STATE,
			viewConfig: { ...DEFAULT_TASK_VIEW_STATE, grouping: pageLocalGrouping("none"), showCompletedTasks: true },
		},
		onChange: () => {},
	},
};

const SKELETON_TITLE_WIDTHS = ["62%", "48%", "70%"];

interface PublicTaskViewProps {
	/** The active tab (the tabs themselves live in the page bar); picks the empty state. */
	tab: BoardTab;
	/** Posts to show: already tab/filter/sort applied. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
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
 * The Feedback board's posts: the shared `<Board />` on a read-only, controlled `BoardProvider`, each post a
 * `PublicTaskItem` row. The page hands it the visible posts in order (`passthrough`), so the board never re-filters or
 * re-sorts the server-ranked pages.
 */
export function PublicTaskView({
	tab,
	tasks,
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
			releases: [],
			passthrough: true,
			pagination: { hasMore, isFetchingMore, loadMore, loadMoreLabel: "Show more posts" },
		}),
		[tasks, labels, categories, hasMore, isFetchingMore, loadMore]
	);

	const showSkeleton = isLoading || (tasks.length === 0 && isFetchingMore);
	const showError = isError && tasks.length === 0 && !isLoading;

	return (
		<BoardProvider
			data={data}
			capabilities={READ_ONLY_CAPABILITIES}
			scope={PUBLIC_BOARD_SCOPE}
			views={PUBLIC_BOARD_VIEWS}
			renderers={PUBLIC_BOARD_RENDERERS}
		>
			<section className="w-full min-w-0 px-4 pt-5 pb-16 md:pt-3">
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
						className="flex items-center gap-3.5 rounded-xl border border-destructive/50 bg-card px-5 py-5"
					>
						<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
							<IconAlertTriangle aria-hidden className="size-5" />
						</span>
						<div className="min-w-0 flex-1">
							<div className="font-semibold text-[15px]">We could not load the board</div>
							<div className="text-[13.5px] text-muted-foreground">Check your connection and try again.</div>
						</div>
						<Button variant="outline" size="sm" onClick={onRetry}>
							<IconRefresh aria-hidden />
							Retry
						</Button>
					</div>
				) : showSkeleton ? (
					<>
						<div aria-busy className="flex flex-col gap-1">
							{SKELETON_TITLE_WIDTHS.map((width) => (
								<div key={width} aria-hidden className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-4" style={{ width }} />
									<Skeleton className="h-3 w-3/5" />
								</div>
							))}
						</div>
						<BoardFooter />
					</>
				) : tasks.length === 0 ? (
					<>
						<BoardEmptyState
							tab={tab}
							boardIsEmpty={boardIsEmpty}
							hasActiveFilters={hasActiveFilters}
							onShowAll={onShowAll}
							onClearFilters={onClearFilters}
						/>
						{/* Filters can leave nothing visible while more pages exist: keep "Show more posts" reachable. */}
						<BoardFooter />
					</>
				) : (
					<Board />
				)}
			</section>
		</BoardProvider>
	);
}
