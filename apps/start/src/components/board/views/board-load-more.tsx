import { Button } from "@repo/ui/components/button";
import { useBoardData, useBoardRenderers } from "../core/board-data";
import { getLoadMoreState } from "./card-sections";

/**
 * The "Show more" footer for a board whose data source is paged (`BoardDataSource.pagination`).
 * Renders nothing when there is no further page. The label comes from the data source
 * (`pagination.loadMoreLabel`, e.g. "Show more posts"), defaulting to "Show more".
 */
export function BoardLoadMore() {
	const { pagination } = useBoardData();
	const state = getLoadMoreState(pagination);
	if (!pagination || !state.visible) return null;

	return (
		<div className="flex justify-center py-3">
			<Button
				type="button"
				variant="accent"
				size="sm"
				disabled={state.disabled}
				aria-busy={state.disabled}
				onClick={pagination.loadMore}
			>
				{state.label}
			</Button>
		</div>
	);
}

/**
 * What the list, kanban and card views render under their content: the page's `renderers.footer`
 * (or BoardLoadMore) while the data source has another page, nothing otherwise — so a custom footer
 * never has to re-check `pagination.hasMore`.
 */
export function BoardFooter() {
	const { pagination } = useBoardData();
	const { footer } = useBoardRenderers();
	if (!getLoadMoreState(pagination).visible) return null;
	const Footer = footer ?? BoardLoadMore;
	return <Footer />;
}
