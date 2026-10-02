import { Skeleton } from "@repo/ui/components/skeleton";

/** Loading placeholder for the post view in the board panel. */
export function PeekSkeleton() {
	return (
		<div aria-busy="true" className="px-5 pt-4 pb-8">
			<div className="mb-4 flex gap-3">
				<Skeleton className="h-6 w-20 rounded-full" />
				<Skeleton className="h-6 w-28 rounded-full" />
			</div>
			<Skeleton className="mb-3 h-8 w-4/5" />
			<Skeleton className="mb-6 h-5 w-1/3" />
			<Skeleton className="mb-6 h-11 w-full rounded-lg" />
			<Skeleton className="mb-4 h-24 w-full rounded-xl" />
			<Skeleton className="h-32 w-full" />
		</div>
	);
}
