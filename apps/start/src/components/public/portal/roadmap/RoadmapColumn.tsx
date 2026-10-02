import { Skeleton } from "@repo/ui/components/skeleton";
import type { ReactNode } from "react";

interface RoadmapColumnProps {
	/** Header chip or title (a `StatusChip`, or the release name). */
	title: ReactNode;
	/** Number of cards; shown with a trailing "+" when more posts may still be loading. */
	count: number;
	hasMore?: boolean;
	description: ReactNode;
	/** Shown instead of cards when the column has none. */
	emptyMessage: string;
	children?: ReactNode;
}

/** A 360px roadmap column: header (title, count), one-line description, then a recessed container of cards. */
export function RoadmapColumn({
	title,
	count,
	hasMore = false,
	description,
	emptyMessage,
	children,
}: RoadmapColumnProps) {
	return (
		<section className="w-[360px] shrink-0 lg:w-auto lg:max-w-[360px] lg:min-w-[300px] lg:flex-1 lg:basis-0">
			<div className="flex items-center gap-2.5 px-1 pb-3.5">
				{title}
				<span className="text-[13px] text-portal-fg-3 tabular-nums">
					{count}
					{hasMore ? "+" : ""}
				</span>
			</div>
			<p className="-mt-1.5 px-1 pb-3 text-[13px] text-portal-fg-3">{description}</p>
			<div className="flex flex-col gap-2 rounded-portal-lg border border-portal-line bg-[color-mix(in_oklch,var(--portal-surface)_45%,var(--portal-canvas))] p-2">
				{count === 0 ? (
					<p className="px-3 py-8 text-center text-[13.5px] text-portal-fg-3">{emptyMessage}</p>
				) : (
					children
				)}
			</div>
		</section>
	);
}

/** Placeholder column while the roadmap loads. */
export function RoadmapColumnSkeleton() {
	return (
		<section
			aria-hidden
			className="w-[360px] shrink-0 lg:w-auto lg:max-w-[360px] lg:min-w-[300px] lg:flex-1 lg:basis-0"
		>
			<div className="flex items-center gap-2.5 px-1 pb-3.5">
				<Skeleton className="h-6 w-24 rounded-full bg-portal-raised" />
			</div>
			<Skeleton className="mx-1 mb-3 h-4 w-48 bg-portal-raised" />
			<div className="flex flex-col gap-2 rounded-portal-lg border border-portal-line bg-[color-mix(in_oklch,var(--portal-surface)_45%,var(--portal-canvas))] p-2">
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
