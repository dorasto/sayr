import { Skeleton } from "@repo/ui/components/skeleton";

/** Pending state for the public org layout: the nav bar's footprint and a few skeleton rows. */
export function PublicLayoutPending() {
	return (
		<div className="portal flex h-dvh flex-col overflow-hidden bg-sidebar">
			<div className="h-14 w-full shrink-0 border-b border-border bg-sidebar md:h-16" />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="flex-1 min-h-0 w-full">
					<div className="flex flex-1 h-full w-full pb-2 pt-2 pr-2 pl-2">
						<div className="h-full w-full rounded-2xl bg-background border dark:border-transparent p-6">
							<div className="mx-auto max-w-3xl space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
