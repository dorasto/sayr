import { Button } from "@repo/ui/components/button";
import { IconLoader2 } from "@tabler/icons-react";
import { useBoardData } from "@/components/board/core/board-data";

/** The roadmap's `renderers.footer`: shown under the columns while the data source has another page. */
export function RoadmapFooter() {
	const { pagination } = useBoardData();

	if (!pagination) return null;
	return (
		<div className="flex flex-col items-start gap-2 pt-6">
			<p className="text-[13px] text-muted-foreground">Showing the most voted posts. There may be more.</p>
			<Button variant="outline" onClick={pagination.loadMore} disabled={pagination.isFetchingMore}>
				{pagination.isFetchingMore ? (
					<>
						<IconLoader2 className="animate-spin" />
						Loading
					</>
				) : (
					(pagination.loadMoreLabel ?? "Show more")
				)}
			</Button>
		</div>
	);
}
