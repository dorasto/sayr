import type { schema } from "@repo/database";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { BoardHead } from "./portal/board/BoardHead";
import { BoardEmptyState, BoardErrorState, BoardNoActiveState, BoardNoResultsState } from "./portal/board/BoardStates";
import { BoardToolbar, type BoardToolbarProps } from "./portal/board/BoardToolbar";
import { PUBLIC_BOARD_PANEL_ID } from "./portal/board/constants";
import type { PublicReleaseSummary } from "./portal/board/useBoardSideData";
import { usePeek } from "./portal/peek/peek-context";
import { ListContainer } from "./portal/ui/ListContainer";
import { PortalButton } from "./portal/ui/PortalButton";
import { RowSkeletonList } from "./portal/ui/RowSkeleton";
import { usePublicPostAbility } from "./public-task-creator";
import { PublicTaskItem } from "./task-item";

export interface PublicTaskViewProps {
	toolbar: BoardToolbarProps;
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
}

/**
 * The board's main column: page head and the post list (tabs, sort, filters, rows, Show more). The composer,
 * categories and latest release live in the board's right-hand panel (`BoardRailPanel`), not here.
 */
export function PublicTaskView({
	toolbar,
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
}: PublicTaskViewProps) {
	const { organization, categories } = usePublicOrganizationLayout();
	const { canPost } = usePublicPostAbility();

	// While a post is showing in the panel the list is narrower and rows go compact (no excerpt) with the selected one
	// marked. Row clicks are handed to the panel's provider (`openPost`), which shows the post on desktop and otherwise
	// lets the link navigate to the full post.
	const { openPost, shortId: selectedShortId } = usePeek();
	const postSelected = selectedShortId !== null;

	const showSkeleton = isLoading || (tasks.length === 0 && isFetchingMore);
	const showError = isError && tasks.length === 0 && !isLoading;

	return (
		<div className="mx-auto w-full max-w-[760px] px-4 pt-6 pb-16 md:px-6 md:pt-8 xl:pt-11">
			<BoardHead organization={organization} />

			<section className="mt-6 min-w-0 md:mt-8 lg:mt-10">
				{/* Below 1024px the panel is a sheet that never opens by itself: this opens it on the composer. */}
				{canPost && (
					<PortalButton
						variant="primary"
						size="lg"
						className="mb-5 h-12 w-full lg:hidden"
						onClick={() => sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true)}
					>
						<IconPlus aria-hidden />
						Share an idea or report a bug
					</PortalButton>
				)}

				<BoardToolbar {...toolbar} />

				{showError ? (
					<BoardErrorState onRetry={onRetry} />
				) : showSkeleton ? (
					<RowSkeletonList />
				) : tasks.length === 0 ? (
					<ListContainer>
						{boardIsEmpty ? (
							<BoardEmptyState orgSlug={organization.slug} canPost={canPost} />
						) : toolbar.tab === "active" && !hasActiveFilters ? (
							<BoardNoActiveState onShowAll={() => toolbar.onTabChange("all")} />
						) : (
							<BoardNoResultsState
								tabLabel={toolbar.tab === "done" ? "Done" : toolbar.tab === "all" ? "All" : "Active"}
								onClear={hasActiveFilters ? onClearFilters : undefined}
							/>
						)}
					</ListContainer>
				) : (
					<ListContainer>
						{tasks.map((task) => (
							<PublicTaskItem
								key={task.id}
								task={task}
								categories={categories}
								release={task.releaseId ? (releasesById.get(task.releaseId) ?? null) : null}
								compact={postSelected}
								onOpen={openPost}
								selected={postSelected && selectedShortId === task.shortId}
							/>
						))}
					</ListContainer>
				)}

				{hasMore && !showError && (
					<div className="mt-5 flex justify-center">
						<PortalButton onClick={onShowMore} disabled={isFetchingMore} className="max-md:h-11">
							{isFetchingMore ? (
								<>
									<IconLoader2 className="animate-spin" />
									Loading
								</>
							) : (
								"Show more posts"
							)}
						</PortalButton>
					</div>
				)}
			</section>
		</div>
	);
}
