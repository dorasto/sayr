import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { getReleaseDisplayDate, isUpcomingStatus } from "@/lib/portal/changelog";
import { ReleasedCard } from "./ReleasedCard";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import type { PublicRelease } from "./types";
import { UpcomingCard } from "./UpcomingCard";

interface ChangelogEntryProps {
	release: PublicRelease;
	orgSlug: string;
	/** Last item of the timeline: the connector line stops at its dot. */
	isLast: boolean;
}

/**
 * One timeline entry: a 150px right-aligned rail (version = release slug, date, status chip), the connector line with
 * its dot (primary for upcoming, green for released) and the card.
 */
export function ChangelogEntry({ release, orgSlug, isLast }: ChangelogEntryProps) {
	const upcoming = isUpcomingStatus(release.status);
	const { date } = getReleaseDisplayDate(release);

	return (
		<article
			className={cn("grid grid-cols-1 gap-3 md:grid-cols-[150px_40px_1fr] md:gap-0", !isLast && "mb-8 md:mb-10")}
		>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:block md:pt-0.5 md:text-right">
				<div className="font-bold text-[22px] text-foreground leading-7 tracking-[-0.02em] tabular-nums">
					{release.slug}
				</div>
				<div className="text-[13px] text-muted-foreground md:mt-1 md:mb-2.5">
					{date ? formatDate(date, "en-GB") : "No target date"}
				</div>
				<ReleaseStatusChip status={release.status} />
			</div>
			<div aria-hidden className="relative hidden md:block">
				<span
					className={cn("absolute top-0 left-[19px] block w-px bg-border", isLast ? "bottom-0" : "-bottom-10")}
				/>
				<i
					className={cn(
						"absolute top-[9px] left-3.5 block size-[11px] rounded-full border-2",
						upcoming ? "border-primary bg-primary" : "border-success bg-success"
					)}
				/>
			</div>
			<div className="min-w-0">
				{upcoming ? (
					<UpcomingCard release={release} orgSlug={orgSlug} />
				) : (
					<ReleasedCard release={release} orgSlug={orgSlug} />
				)}
			</div>
		</article>
	);
}
