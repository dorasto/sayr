import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Card } from "@repo/ui/components/card";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import type { ReactNode } from "react";
import { BarRow } from "@/components/public/portal/ui/BarRow";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import type { ReleaseProgress } from "@/lib/portal/release-progress";
import { ReleaseStatusChip } from "./ReleaseStatusChip";

interface Lead {
	name: string;
	image: string | null;
	displayName?: string | null;
}

interface ReleaseDetailPanelContentProps {
	release: {
		status: string;
		releasedAt?: Date | string | null;
		targetDate?: Date | string | null;
		createdAt?: Date | string | null;
	};
	progress: ReleaseProgress;
	/** The release lead when they are on the org's team, else `null` (the row is hidden). */
	lead: Lead | null;
	/** Posts from people outside the team, or `null` when the team cannot be resolved (the row is hidden). */
	userPostCount: number | null;
	/** Linked GitHub pull request section, rendered last when present. */
	pullRequests?: ReactNode;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3 border-t py-1 text-[13.5px] first:border-t-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-foreground">
				{children}
			</dd>
		</div>
	);
}

function LegendRow({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
	return (
		<span className="flex items-center justify-between">
			<span className="inline-flex items-center gap-1.5 text-foreground">
				<i aria-hidden className={`block size-2 shrink-0 rounded-[3px] ${dotClass}`} />
				{label}
			</span>
			<span className="text-muted-foreground tabular-nums">{count}</span>
		</span>
	);
}

/**
 * Release drawer (`public-release-detail-panel`): Progress, What it touches, Details and — when there is one — the
 * linked pull request. Pure props, so the page memoises it once and hands it to the panel.
 */
export function ReleaseDetailPanelContent({
	release,
	progress,
	lead,
	userPostCount,
	pullRequests,
}: ReleaseDetailPanelContentProps) {
	const touches = progress.labelCounts.slice(0, 5);
	const { date } = getReleaseDisplayDate(release);
	const showTarget = release.status !== "released" && !!date;

	return (
		<div className="flex flex-col gap-3 p-1">
			<Card className="rounded-xl p-5">
				<h3 className="mb-3 font-semibold text-[13px] text-foreground">Progress</h3>
				{progress.total > 0 ? (
					<>
						<div className="flex items-baseline gap-2">
							<span className="font-bold text-4xl text-foreground leading-10 tracking-[-0.03em] tabular-nums">
								{progress.percent}%
							</span>
							<span className="text-muted-foreground text-sm">done</span>
						</div>
						<SegmentedProgress
							className="my-3.5 h-2.5"
							label={`${progress.done} of ${progress.total} tasks done`}
							segments={[
								{ value: progress.done, tone: "ok" },
								{ value: progress.inProgress, tone: "accent" },
								{ value: progress.planned, tone: "muted" },
							]}
						/>
						<div className="flex flex-col gap-2 text-[13.5px]">
							<LegendRow label="Done" count={progress.done} dotClass="bg-success" />
							<LegendRow label="In progress" count={progress.inProgress} dotClass="bg-primary" />
							<LegendRow label="Planned" count={progress.planned} dotClass="bg-border" />
						</div>
					</>
				) : (
					<p className="text-[13.5px] text-muted-foreground">No public posts are linked to this release yet.</p>
				)}
			</Card>

			{touches.length > 0 && (
				<Card className="rounded-xl p-5">
					<h3 className="mb-3 font-semibold text-[13px] text-foreground">What it touches</h3>
					<div className="flex flex-col gap-3.5">
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
				</Card>
			)}

			<Card className="rounded-xl p-5">
				<h3 className="mb-3 font-semibold text-[13px] text-foreground">Details</h3>
				<dl className="flex flex-col">
					{lead && (
						<DetailRow label="Release lead">
							<span className="inline-flex items-center gap-2">
								<Avatar className="size-[22px] shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--primary)]">
									<AvatarImage
										src={lead.image ? ensureCdnUrl(lead.image) : undefined}
										alt={getDisplayName(lead)}
									/>
									<AvatarFallback className="text-xs">{getInitials(getDisplayName(lead))}</AvatarFallback>
								</Avatar>
								{getDisplayName(lead)}
							</span>
						</DetailRow>
					)}
					{showTarget && date && <DetailRow label="Target date">{formatDate(date, "en-GB")}</DetailRow>}
					{release.createdAt && (
						<DetailRow label="Created">{formatDate(new Date(release.createdAt), "en-GB")}</DetailRow>
					)}
					<DetailRow label="Status">
						<ReleaseStatusChip status={release.status} />
					</DetailRow>
					{userPostCount !== null && progress.total > 0 && (
						<DetailRow label="Posts from users">
							{userPostCount} of {progress.total}
						</DetailRow>
					)}
				</dl>
			</Card>

			{pullRequests}
		</div>
	);
}
