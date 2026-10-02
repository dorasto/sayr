import { IconLoader2 } from "@tabler/icons-react";
import { useBoardData } from "@/components/board/core/board-data";
import { PortalButton } from "../ui/PortalButton";

/**
 * The board's footer renderer (`renderers.footer`): "Show more posts". Pagination comes from the surrounding
 * `BoardProvider`; `BoardFooter` only mounts it while another page exists.
 */
export function ShowMorePosts() {
	const { pagination } = useBoardData();
	if (!pagination) return null;

	return (
		<div className="mt-5 flex justify-center">
			<PortalButton
				onClick={pagination.loadMore}
				disabled={pagination.isFetchingMore}
				aria-busy={pagination.isFetchingMore}
				className="max-md:h-11"
			>
				{pagination.isFetchingMore ? (
					<>
						<IconLoader2 aria-hidden className="animate-spin" />
						Loading
					</>
				) : (
					(pagination.loadMoreLabel ?? "Show more posts")
				)}
			</PortalButton>
		</div>
	);
}
