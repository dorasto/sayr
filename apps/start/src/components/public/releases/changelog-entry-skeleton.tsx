import { Skeleton } from "@repo/ui/components/skeleton";

/** Loading placeholder shaped like one changelog timeline entry (rail, connector column, card). */
export function ChangelogEntrySkeleton() {
	return (
		<div aria-hidden className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-[150px_40px_1fr] md:gap-0">
			<div className="flex flex-col items-start gap-2 md:items-end">
				<Skeleton className="h-7 w-16" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-6 w-20 rounded-full" />
			</div>
			<div className="hidden md:block" />
			<Skeleton className="h-44 rounded-xl" />
		</div>
	);
}
