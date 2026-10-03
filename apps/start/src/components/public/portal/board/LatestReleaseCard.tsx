import { buttonVariants } from "@repo/ui/components/button";
import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowRight, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { formatShortDate, pickLatestRelease } from "@/lib/portal/board-row";
import { getReleaseDate } from "@/lib/portal/status";
import { type PublicReleaseSummary, useReleaseTaskCount } from "./useBoardSideData";

interface LatestReleaseCardProps {
	orgSlug: string;
	releases: ReadonlyArray<PublicReleaseSummary>;
}

/** "Latest release": the newest released release with its version, name, date and (when known) shipped-post count. */
export function LatestReleaseCard({ orgSlug, releases }: LatestReleaseCardProps) {
	const latest = useMemo(() => pickLatestRelease(releases), [releases]);
	const taskCount = useReleaseTaskCount(orgSlug, latest?.slug ?? null);

	if (!latest) return null;

	const date = formatShortDate(getReleaseDate(latest), new Date(), true);
	const shipped = taskCount === null ? null : `${taskCount} ${taskCount === 1 ? "post" : "posts"} shipped`;

	return (
		<Tile className="flex-col items-stretch gap-3 md:w-full">
			<TileHeader className="w-full">
				<TileIcon>
					<IconRocket />
				</TileIcon>
				<TileTitle className="text-sm">Latest release</TileTitle>
				<TileDescription className="text-xs">{latest.slug}</TileDescription>
			</TileHeader>
			<Link
				to="/orgs/$orgSlug/releases/$releaseSlug"
				params={{ orgSlug, releaseSlug: latest.slug }}
				className="flex flex-col rounded-lg border border-transparent p-1.5 outline-none transition-colors hover:border-border hover:bg-secondary focus-visible:border-border"
			>
				<span className="truncate font-medium text-sm">{latest.name}</span>
				<span className="text-muted-foreground text-xs">{[date, shipped].filter(Boolean).join(" · ")}</span>
			</Link>
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full max-md:h-11")}
			>
				Read the changelog
				<IconArrowRight aria-hidden />
			</Link>
		</Tile>
	);
}
