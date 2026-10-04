import { Skeleton } from "@repo/ui/components/skeleton";

/** Loading placeholder shaped like one changelog card (`ReleaseCard` without a cover). */
export function ChangelogEntrySkeleton() {
	return (
		<div aria-hidden className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3">
			<div className="flex items-center gap-2">
				<Skeleton className="h-5 w-20 rounded-full" />
				<Skeleton className="h-3 w-28" />
			</div>
			<Skeleton className="h-4 w-2/5" />
			<Skeleton className="h-3 w-4/5" />
			<Skeleton className="h-3 w-3/5" />
		</div>
	);
}
