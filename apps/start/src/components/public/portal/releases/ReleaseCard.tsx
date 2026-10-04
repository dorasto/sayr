import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDate } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useReleaseProgress } from "@/hooks/portal/useReleaseProgress";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { getFirstImage, getReleaseExcerpt } from "@/lib/portal/release-notes";
import { ReleaseLead } from "./ReleaseLead";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import type { PublicRelease } from "./types";

interface ReleaseCardProps {
	release: PublicRelease;
	orgSlug: string;
}

/**
 * One card in the changelog feed, styled like the Feedback posts: the whole card links to the release page. The first
 * image in the notes becomes the cover; below it the status, version and date, the name, a plain-text excerpt of the
 * notes, and the lead with how many posts the release shipped.
 */
export function ReleaseCard({ release, orgSlug }: ReleaseCardProps) {
	const cover = getFirstImage(release.descriptionMarkdown);
	const excerpt = getReleaseExcerpt(release.descriptionMarkdown);
	const { prefix, date } = getReleaseDisplayDate(release);
	const progress = useReleaseProgress(orgSlug, release.slug);
	const shipped = progress?.done ?? 0;

	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug, releaseSlug: release.slug }}
			className="group flex flex-col overflow-hidden rounded-xl bg-card outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
		>
			{cover && (
				<img
					src={ensureCdnUrl(cover)}
					alt=""
					loading="lazy"
					decoding="async"
					className="aspect-[21/9] w-full border-b object-cover"
				/>
			)}
			<div className="flex flex-col gap-1.5 px-4 py-3">
				<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
					<ReleaseStatusChip status={release.status} />
					<span className="tabular-nums">
						{release.slug}
						{date && ` · ${prefix} ${formatDate(date, "en-GB")}`}
					</span>
				</div>
				<Label variant="heading" className="mt-1 line-clamp-2 cursor-pointer">
					{release.name}
				</Label>
				{excerpt && (
					<p className={cn("text-muted-foreground text-sm", cover ? "line-clamp-2" : "line-clamp-3")}>{excerpt}</p>
				)}
				<div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
					<ReleaseLead leadId={release.leadId} className="text-xs" />
					{shipped > 0 && (
						<span>
							{shipped} {shipped === 1 ? "post" : "posts"} shipped
						</span>
					)}
					<span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
						Read
						<IconArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
					</span>
				</div>
			</div>
		</Link>
	);
}
