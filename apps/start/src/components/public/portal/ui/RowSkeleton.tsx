import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ListContainer } from "./ListContainer";

const SKELETON = "bg-portal-raised rounded-portal-tag";

/** One loading row: vote box + title + two excerpt lines. */
export function RowSkeleton({ titleWidth = "62%", className }: { titleWidth?: string; className?: string }) {
	return (
		<div aria-hidden className={cn("flex gap-4 border-portal-line border-t p-5 first:border-t-0", className)}>
			<Skeleton className="h-14 w-12 shrink-0 rounded-portal-md bg-portal-raised" />
			<div className="flex-1">
				<Skeleton className={cn("mb-3 h-4", SKELETON)} style={{ width: titleWidth }} />
				<Skeleton className={cn("mb-2 h-3 w-[92%] opacity-70", SKELETON)} />
				<Skeleton className={cn("h-3 w-3/5 opacity-70", SKELETON)} />
			</div>
		</div>
	);
}

const TITLE_WIDTHS = ["62%", "48%", "70%"];

/** A `ListContainer` of loading rows. */
export function RowSkeletonList({ count = 3, className }: { count?: number; className?: string }) {
	return (
		<ListContainer aria-busy className={className}>
			{Array.from({ length: count }, (_, index) => (
				<RowSkeleton
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
					key={index}
					titleWidth={TITLE_WIDTHS[index % TITLE_WIDTHS.length]}
				/>
			))}
		</ListContainer>
	);
}
