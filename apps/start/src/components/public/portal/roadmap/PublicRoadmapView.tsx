import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { type ReactNode, useMemo } from "react";
import { useRoadmap } from "@/hooks/portal/useRoadmap";
import { filterBoardTasks } from "@/lib/portal/board-filters";
import { RoadmapBoard } from "./roadmap-board";

const SKELETON_COLUMNS = [0, 1, 2];

interface PublicRoadmapViewProps {
	/** Shown above the columns (the Feedback card with the controls). */
	header: ReactNode;
	/** The board's category and label filters, applied to the roadmap too. */
	categoryId: string | null;
	labelIds: ReadonlyArray<string>;
}

/**
 * The Feedback board's roadmap layout (`?layout=roadmap`): the Feedback card, then Planned / In progress / Done
 * recently as the admin board's full-height kanban. The page does not scroll here; each column scrolls on its own.
 * Owns the roadmap data (`useRoadmap`) and its loading/error states.
 */
export function PublicRoadmapView({ header, categoryId, labelIds }: PublicRoadmapViewProps) {
	const roadmap = useRoadmap();
	const tasks = useMemo(
		() => filterBoardTasks(roadmap.tasks, { tab: "all", categoryId, labelIds, statuses: [] }),
		[roadmap.tasks, categoryId, labelIds]
	);

	let columns: ReactNode;
	if (roadmap.isError) {
		columns = (
			<div
				role="alert"
				className="flex items-center gap-3.5 rounded-xl border border-destructive/50 bg-card px-5 py-5"
			>
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
				>
					<IconAlertTriangle className="size-5" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="font-semibold text-[15px]">We could not load the roadmap</div>
					<div className="text-[13.5px] text-muted-foreground">Check your connection and try again.</div>
				</div>
				<Button variant="outline" onClick={roadmap.retry}>
					<IconRefresh aria-hidden />
					Retry
				</Button>
			</div>
		);
	} else if (roadmap.isLoading) {
		columns = (
			<div className="flex h-full gap-3 overflow-x-auto" aria-busy="true">
				<span className="sr-only">Loading the roadmap</span>
				{SKELETON_COLUMNS.map((index) => (
					<section key={index} aria-hidden className="min-w-[280px] flex-1">
						<div className="flex items-center gap-2.5 px-3.5 py-2.5">
							<Skeleton className="h-6 w-24 rounded-full" />
						</div>
						<div className="flex flex-col gap-2.5 p-2.5">
							{["76%", "58%", "84%"].map((width) => (
								<div key={width} className="rounded-lg border bg-card px-4 py-3.5">
									<Skeleton className="mb-3 h-3.5 w-14" />
									<Skeleton className="h-4" style={{ width }} />
									<Skeleton className="mt-4 h-3.5 w-28" />
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		);
	} else {
		columns = (
			<RoadmapBoard
				tasks={tasks}
				releasesById={roadmap.releasesById}
				capped={roadmap.capped}
				isFetchingMore={roadmap.isFetchingMore}
				onShowMore={roadmap.showMore}
			/>
		);
	}

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col px-4 pt-5 md:pt-3">
			<div className="shrink-0">{header}</div>
			<div className="min-h-0 flex-1 pb-4">{columns}</div>
		</div>
	);
}
