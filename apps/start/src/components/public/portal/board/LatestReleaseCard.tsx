import { Card } from "@repo/ui/components/card";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { formatShortDate, pickLatestRelease } from "@/lib/portal/board-row";
import { getReleaseDate } from "@/lib/portal/status";
import { Pill } from "../ui/Pill";
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
		<Card className="p-5">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="font-semibold text-[13px]">Latest release</h3>
				<Pill variant="gh">{latest.slug}</Pill>
			</div>
			<Link
				to="/orgs/$orgSlug/releases/$releaseSlug"
				params={{ orgSlug, releaseSlug: latest.slug }}
				className="block outline-none"
			>
				<p className="font-semibold text-sm leading-[21px] tracking-[-0.006em]">{latest.name}</p>
				<p className="mt-1.5 text-[13px] text-muted-foreground">{[date, shipped].filter(Boolean).join(" · ")}</p>
			</Link>
			<div className="my-3.5 h-px bg-border" />
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className="inline-flex items-center gap-1.5 font-medium text-[13px] text-primary max-md:min-h-11 hover:underline focus-visible:underline"
			>
				Read the changelog
				<IconArrowRight aria-hidden className="size-3.5" />
			</Link>
		</Card>
	);
}
