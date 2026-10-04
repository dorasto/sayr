import { Skeleton } from "@repo/ui/components/skeleton";

/** Loading placeholder for the post view in the board panel (same layout as `PeekPostView`). */
export function PeekSkeleton() {
	return (
		<div aria-busy="true" className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<div className="flex gap-2">
					<Skeleton className="h-6 w-20 rounded-lg" />
					<Skeleton className="h-6 w-24 rounded-lg" />
					<Skeleton className="ml-auto h-6 w-12 rounded-lg" />
				</div>
				<Skeleton className="h-7 w-4/5" />
				<Skeleton className="h-5 w-1/3" />
			</div>
			<Skeleton className="h-32 w-full" />
		</div>
	);
}
