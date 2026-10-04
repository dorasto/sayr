import { Button } from "@repo/ui/components/button";
import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { formatDate } from "@repo/util";
import { IconBulb, IconCalendarEvent } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { useReleaseProgress } from "@/hooks/portal/useReleaseProgress";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import type { PublicRelease } from "./types";

interface ChangelogRailProps {
	orgSlug: string;
	/** Planned and in-progress releases, soonest first. */
	upcoming: ReadonlyArray<PublicRelease>;
	isLoading: boolean;
}

/**
 * The changelog's right-hand panel, like the Feedback board's: "Coming next" (each upcoming release with its target date
 * and progress, linking to its page) and a pointer to the Feedback board.
 */
export function ChangelogRail({ orgSlug, upcoming, isLoading }: ChangelogRailProps) {
	return (
		<div className="flex flex-col gap-3">
			<Tile className="flex-col items-stretch gap-3 md:w-full">
				<TileHeader className="w-full">
					<TileIcon>
						<IconCalendarEvent />
					</TileIcon>
					<TileTitle className="text-sm">Coming next</TileTitle>
					<TileDescription className="text-xs">What the team is working on</TileDescription>
				</TileHeader>
				{isLoading ? (
					<div className="flex flex-col gap-3 p-1.5" aria-busy>
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
					</div>
				) : upcoming.length === 0 ? (
					<p className="p-1.5 text-muted-foreground text-xs">Nothing is planned right now.</p>
				) : (
					<div className="flex flex-col gap-1">
						{upcoming.map((release) => (
							<UpcomingRow key={release.id} release={release} orgSlug={orgSlug} />
						))}
					</div>
				)}
			</Tile>

			<Tile className="flex-col items-stretch gap-3 md:w-full">
				<TileHeader className="w-full">
					<TileIcon>
						<IconBulb />
					</TileIcon>
					<TileTitle className="text-sm">Got an idea?</TileTitle>
					<TileDescription className="text-xs">Tell the team on the Feedback board.</TileDescription>
				</TileHeader>
				<Button
					render={<Link to="/orgs/$orgSlug" params={{ orgSlug }} />}
					nativeButton={false}
					variant="outline"
					size="sm"
					className="w-full max-md:h-11"
				>
					Share feedback
				</Button>
			</Tile>
		</div>
	);
}

function UpcomingRow({ release, orgSlug }: { release: PublicRelease; orgSlug: string }) {
	const progress = useReleaseProgress(orgSlug, release.slug);
	const { date } = getReleaseDisplayDate(release);

	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug, releaseSlug: release.slug }}
			className="flex flex-col gap-1.5 rounded-lg border border-transparent p-1.5 outline-none transition-colors hover:border-border hover:bg-secondary focus-visible:border-border"
		>
			<span className="flex items-center gap-2">
				<span className="min-w-0 flex-1 truncate font-medium text-sm">{release.name}</span>
				<ReleaseStatusChip status={release.status} className="shrink-0" />
			</span>
			{progress && progress.total > 0 && (
				<SegmentedProgress
					className="h-1.5"
					label={`${progress.done} of ${progress.total} posts done`}
					segments={[
						{ value: progress.done, tone: "ok" },
						{ value: progress.inProgress, tone: "accent" },
						{ value: progress.planned, tone: "muted" },
					]}
				/>
			)}
			<span className="text-muted-foreground text-xs">
				{[
					date ? `Target ${formatDate(date, "en-GB")}` : "No target date",
					progress && progress.total > 0 ? `${progress.done} of ${progress.total} posts done` : null,
				]
					.filter(Boolean)
					.join(" · ")}
			</span>
		</Link>
	);
}
