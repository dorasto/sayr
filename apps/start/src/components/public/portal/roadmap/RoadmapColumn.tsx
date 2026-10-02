import { Skeleton } from "@repo/ui/components/skeleton";

/** Placeholder column while the roadmap loads (same footprint as a board kanban column). */
export function RoadmapColumnSkeleton() {
	return (
		<section aria-hidden className="min-w-[280px] flex-1">
			<div className="flex items-center gap-2.5 px-3.5 py-2.5">
				<Skeleton className="h-6 w-24 rounded-full bg-portal-raised" />
			</div>
			<Skeleton className="mx-3.5 mb-3 h-4 w-48 bg-portal-raised" />
			<div className="flex flex-col gap-2.5 rounded-b-xl bg-portal-surface p-2.5">
				{["76%", "58%", "84%"].map((width) => (
					<div
						key={width}
						className="rounded-portal-md border border-portal-line bg-portal-surface px-4 py-3.5 shadow-portal-hl"
					>
						<Skeleton className="mb-3 h-3.5 w-14 bg-portal-raised" />
						<Skeleton className="h-4 bg-portal-raised" style={{ width }} />
						<Skeleton className="mt-4 h-3.5 w-28 bg-portal-raised" />
					</div>
				))}
			</div>
		</section>
	);
}
