import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import type { ReactNode } from "react";
import { DetailSection } from "@/components/public/panels/detail-section";
import { BarRow } from "@/components/public/portal/ui/BarRow";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import type { ReleaseProgress } from "@/lib/portal/release-progress";
import { LegendRow } from "./LegendRow";
import { ReleaseHealth } from "./ReleaseHealth";
import { ReleaseStatusChip } from "./ReleaseStatusChip";

interface Lead {
	name: string;
	image: string | null;
	displayName?: string | null;
}

interface ReleaseDetailPanelContentProps {
	release: {
		slug: string;
		status: string;
		releasedAt?: Date | string | null;
		targetDate?: Date | string | null;
	};
	progress: ReleaseProgress;
	/** The newest public status update's health, or `null` (the row is hidden). */
	health: string | null;
	/** The release lead when they are on the org's team, else `null` (the row is hidden). */
	lead: Lead | null;
	/** The linked GitHub pull request, shown last under its own heading when set. */
	pullRequest?: ReactNode;
}

/**
 * The release page's Details drawer (`public-release-detail-panel`), laid out like a post's: label/value rows
 * (`DetailSection`), then Progress, Labels and the linked pull request as bordered sections with small
 * headings, like the post drawer's Related posts.
 */
export function ReleaseDetailPanelContent({
	release,
	progress,
	health,
	lead,
	pullRequest,
}: ReleaseDetailPanelContentProps) {
	const touches = progress.labelCounts.slice(0, 5);
	const { prefix, date } = getReleaseDisplayDate(release);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<DetailSection label="Status">
					<ReleaseStatusChip status={release.status} variant="plain" />
				</DetailSection>
				{health && (
					<DetailSection label="Health">
						<ReleaseHealth health={health} className="text-sm" />
					</DetailSection>
				)}
				{lead && (
					<DetailSection label="Lead">
						<Avatar className="size-5">
							<AvatarImage src={lead.image ? ensureCdnUrl(lead.image) : undefined} alt={getDisplayName(lead)} />
							<AvatarFallback className="text-[10px]">{getInitials(getDisplayName(lead))}</AvatarFallback>
						</Avatar>
						<span className="font-medium">{getDisplayName(lead)}</span>
					</DetailSection>
				)}
				{date && (
					<DetailSection label={prefix === "Released" ? "Released" : "Target date"}>
						<time dateTime={date.toISOString()}>{formatDate(date, "en-GB")}</time>
					</DetailSection>
				)}
			</div>

			<section aria-labelledby="release-progress-heading" className="flex flex-col gap-2.5 border-t pt-4">
				<div className="flex items-baseline justify-between">
					<Label id="release-progress-heading" variant="description">
						Progress
					</Label>
					{progress.total > 0 && (
						<span className="font-semibold text-foreground text-sm tabular-nums">{progress.percent}%</span>
					)}
				</div>
				{progress.total > 0 ? (
					<>
						<SegmentedProgress
							className="h-2"
							label={`${progress.done} of ${progress.total} posts done`}
							segments={[
								{ value: progress.done, tone: "ok" },
								{ value: progress.inProgress, tone: "accent" },
								{ value: progress.planned, tone: "muted" },
							]}
						/>
						<div className="flex flex-col gap-1.5 text-sm">
							<LegendRow label="Done" count={progress.done} dotClass="bg-success" />
							<LegendRow label="In progress" count={progress.inProgress} dotClass="bg-primary" />
							<LegendRow label="Planned" count={progress.planned} dotClass="bg-border" />
						</div>
					</>
				) : (
					<p className="text-muted-foreground text-sm">No public posts are linked to this release yet.</p>
				)}
			</section>

			{touches.length > 0 && (
				<section aria-labelledby="release-labels-heading" className="flex flex-col gap-2.5 border-t pt-4">
					<Label id="release-labels-heading" variant="description">
						Labels
					</Label>
					<div className="flex flex-col gap-3">
						{touches.map((label) => (
							<BarRow
								key={label.id}
								label={label.name}
								count={label.count}
								share={label.share}
								color={label.color}
							/>
						))}
					</div>
				</section>
			)}

			{pullRequest && (
				<section aria-labelledby="release-pr-heading" className="flex flex-col gap-2.5 border-t pt-4">
					<Label id="release-pr-heading" variant="description">
						Pull request
					</Label>
					{pullRequest}
				</section>
			)}
		</div>
	);
}
