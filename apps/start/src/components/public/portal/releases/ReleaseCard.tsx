import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDate } from "@repo/util";
import { IconArrowRight, IconMessageCircle, IconSpeakerphone } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useReleaseActivity } from "@/hooks/portal/useReleaseActivity";
import { useReleaseProgress } from "@/hooks/portal/useReleaseProgress";
import { getReleaseDisplayDate } from "@/lib/portal/changelog";
import { getFirstImage, getReleaseExcerpt } from "@/lib/portal/release-notes";
import { findTeamMemberUser } from "@/lib/portal/team";
import { ReleaseLead } from "./ReleaseLead";
import type { PublicRelease } from "./types";

interface ReleaseCardProps {
	release: PublicRelease;
	orgSlug: string;
}

/**
 * One card in the changelog feed; the whole card links to the release page. Every card here is released (the month
 * heading already says when), so there is no status chip: the name leads, with the version and day beside it, then the
 * first image as a cover, an excerpt of the notes, the shipped posts as a progress bar, and a footer with the lead and the
 * release's public activity (status updates and comments).
 */
export function ReleaseCard({ release, orgSlug }: ReleaseCardProps) {
	const cover = getFirstImage(release.descriptionMarkdown);
	const excerpt = getReleaseExcerpt(release.descriptionMarkdown);
	const { date } = getReleaseDisplayDate(release);
	const progress = useReleaseProgress(orgSlug, release.slug);
	const activity = useReleaseActivity(orgSlug, release.slug);
	const hasProgress = !!progress && progress.total > 0;
	const progressLabel = hasProgress
		? progress.done === progress.total
			? `${progress.total} ${progress.total === 1 ? "post" : "posts"} shipped`
			: `${progress.done} of ${progress.total} ${progress.total === 1 ? "post" : "posts"} done`
		: null;
	const { organization } = usePublicOrganizationLayout();
	const hasLead = !!findTeamMemberUser(release.leadId, organization);
	const updateCount = activity?.updateCount ?? 0;
	const commentCount = activity?.commentCount ?? 0;
	const hasFooter = hasLead || updateCount > 0 || commentCount > 0;

	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug, releaseSlug: release.slug }}
			className="group flex flex-col overflow-hidden rounded-xl bg-card outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
		>
			<div className="flex flex-col gap-3 p-4">
				<div className="flex items-start gap-3">
					<div className="min-w-0 flex-1">
						<Label variant="heading" className="line-clamp-2 cursor-pointer">
							{release.name}
						</Label>
						<div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
							<span className="truncate font-mono">{release.slug}</span>
							{date && (
								<>
									<span aria-hidden>·</span>
									<time dateTime={date.toISOString()} className="shrink-0 tabular-nums">
										{formatDate(date, "en-GB")}
									</time>
								</>
							)}
						</div>
					</div>
					<IconArrowRight
						aria-hidden
						className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				</div>

				{cover && (
					<img
						src={ensureCdnUrl(cover)}
						alt=""
						loading="lazy"
						decoding="async"
						className="aspect-[21/9] w-full rounded-lg border object-cover"
					/>
				)}

				{excerpt && (
					<p className={cn("text-muted-foreground text-sm", cover ? "line-clamp-2" : "line-clamp-3")}>{excerpt}</p>
				)}

				{hasProgress && progressLabel && (
					<div className="flex items-center gap-3">
						<SegmentedProgress
							className="h-1.5 flex-1"
							label={progressLabel}
							segments={[
								{ value: progress.done, tone: "ok" },
								{ value: progress.inProgress, tone: "accent" },
								{ value: progress.planned, tone: "muted" },
							]}
						/>
						<span className="shrink-0 text-muted-foreground text-xs tabular-nums">{progressLabel}</span>
					</div>
				)}

				{hasFooter && (
					<div className="flex min-h-6 items-center gap-4 text-muted-foreground text-xs">
						<ReleaseLead leadId={release.leadId} className="min-w-0 text-xs" />
						{updateCount > 0 && (
							<span className="inline-flex items-center gap-1 tabular-nums">
								<IconSpeakerphone aria-hidden className="size-3.5" />
								{updateCount}
								<span className="sr-only">{updateCount === 1 ? "status update" : "status updates"}</span>
							</span>
						)}
						{commentCount > 0 && (
							<span className="inline-flex items-center gap-1 tabular-nums">
								<IconMessageCircle aria-hidden className="size-3.5" />
								{commentCount}
								<span className="sr-only">{commentCount === 1 ? "comment" : "comments"}</span>
							</span>
						)}
					</div>
				)}
			</div>
		</Link>
	);
}
