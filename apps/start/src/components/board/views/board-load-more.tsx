import { Button } from "@repo/ui/components/button";
import { useEffect, useRef } from "react";
import { scrollParentOf } from "@/hooks/portal/useScrollIntoViewWhileSettling";
import { useBoardData, useBoardRenderers } from "../core/board-data";
import { getLoadMoreState } from "./card-sections";

/** How far before the end of the scroll area the next page starts loading. */
const AUTO_LOAD_MARGIN = "600px";

/**
 * The "Show more" footer for a board whose data source is paged (`BoardDataSource.pagination`).
 * Renders nothing when there is no further page. The label comes from the data source
 * (`pagination.loadMoreLabel`, e.g. "Show more posts"), defaulting to "Show more".
 *
 * The next page loads by itself as the footer nears the bottom of its scroll area (the page's inner
 * scroll container, not the window); the button stays as the fallback and for keyboard users.
 */
export function BoardLoadMore() {
	const { pagination } = useBoardData();
	const state = getLoadMoreState(pagination);
	const ref = useRef<HTMLDivElement>(null);
	const loadMore = pagination?.loadMore;

	// Re-observed after every page: if the footer is still in range once it lands, the next one loads too.
	useEffect(() => {
		const el = ref.current;
		if (!el || !loadMore || !state.visible || state.disabled) return;
		const scroller = scrollParentOf(el);
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) loadMore();
			},
			{
				root: scroller === document.scrollingElement ? null : scroller,
				rootMargin: `0px 0px ${AUTO_LOAD_MARGIN} 0px`,
			}
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [loadMore, state.visible, state.disabled]);

	if (!pagination || !state.visible) return null;

	return (
		<div ref={ref} className="flex justify-center py-3">
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
