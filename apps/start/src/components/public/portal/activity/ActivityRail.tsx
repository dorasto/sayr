import { cn } from "@repo/ui/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { schema } from "@repo/database";
import type { VoteBarSegment, VoteStatusRow, VoteStatusTone } from "@/lib/portal/activity";
import { formatShortDate } from "@/lib/portal/board-row";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { PortalCard, PortalCardTitle } from "../ui/PortalCard";
import { SegmentedProgress } from "../ui/SegmentedProgress";

export interface ShippedItem {
	task: schema.TaskWithLabels;
	release: PublicReleaseSummary;
	date: Date | null;
}

/** Voted posts that have shipped: up to three, with the release they landed in. Renders nothing when there are none. */
export function ShippedBecauseYouAskedCard({ orgSlug, items }: { orgSlug: string; items: ReadonlyArray<ShippedItem> }) {
	if (items.length === 0) return null;

	return (
		<PortalCard>
			<PortalCardTitle>Shipped because you asked</PortalCardTitle>
			<ul className="flex flex-col gap-4">
				{items.map(({ task, release, date }) => {
					const releasedOn = formatShortDate(date);
					return (
						<li key={task.id}>
							<Link
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(task.shortId) }}
								className="flex items-start gap-3 rounded-portal-md outline-none"
							>
								<span
									aria-hidden
									className="flex size-7 shrink-0 items-center justify-center rounded-portal-md bg-portal-ok-soft text-portal-ok"
								>
									<IconCheck className="size-4" stroke={2.6} />
								</span>
								<span className="min-w-0">
									<span className="block font-semibold text-[14px] text-portal-fg leading-5">
										{task.title}
									</span>
									<span className="mt-1 block text-[13px] text-portal-fg-3">
										Released in {release.name}
										{releasedOn && ` · ${releasedOn}`}
									</span>
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</PortalCard>
	);
}

const SWATCH: Record<VoteStatusTone, string> = {
	ok: "bg-portal-ok",
	accent: "bg-portal-accent",
	muted: "bg-portal-line-2",
	// Won't do is listed but not part of the bar: a hollow swatch says so.
	hollow: "border-[1.5px] border-portal-fg-3",
};

/** The viewer's voted posts by public status: a segmented bar and a legend of the statuses that have any. */
export function VotesStandCard({
	rows,
	segments,
}: {
	rows: ReadonlyArray<VoteStatusRow>;
	segments: ReadonlyArray<VoteBarSegment>;
}) {
	const visibleRows = rows.filter((row) => row.count > 0);
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	if (total === 0) return null;

	const summary = visibleRows.map((row) => `${row.count} ${row.label.toLowerCase()}`).join(", ");

	return (
		<PortalCard>
			<PortalCardTitle>Where your votes stand</PortalCardTitle>
			<SegmentedProgress segments={segments} label={`Your voted posts: ${summary}`} className="mb-3.5 h-2" />
			<ul className="flex flex-col gap-2 text-[13.5px]">
				{visibleRows.map((row) => (
					<li key={row.status} className="flex items-center justify-between">
						<span className="inline-flex items-center gap-2 text-portal-fg">
							<i aria-hidden className={cn("block size-2 shrink-0 rounded-[3px]", SWATCH[row.tone])} />
							{row.label}
						</span>
						<span className="text-portal-fg-2 tabular-nums">{row.count}</span>
					</li>
				))}
			</ul>
		</PortalCard>
	);
}
