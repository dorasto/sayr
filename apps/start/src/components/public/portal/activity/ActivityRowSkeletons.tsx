import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";

interface ActivityRowSkeletonsProps {
	className?: string;
}

/** Muted placeholder rows (vote box, title, two excerpt lines) inside a bordered list shell. */
export function ActivityRowSkeletons({ className }: ActivityRowSkeletonsProps) {
	return (
		<div aria-busy className={cn("overflow-hidden rounded-xl border bg-card", className)}>
			{["62%", "48%", "70%", "62%"].map((titleWidth, index) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
					key={index}
					aria-hidden
					className="flex gap-4 border-t p-5 first:border-t-0"
				>
					<Skeleton className="h-14 w-12 shrink-0 rounded-lg" />
					<div className="flex-1">
						<Skeleton className="mb-3 h-4" style={{ width: titleWidth }} />
						<Skeleton className="mb-2 h-3 w-[92%] opacity-70" />
						<Skeleton className="h-3 w-3/5 opacity-70" />
					</div>
				</div>
			))}
		</div>
	);
}
