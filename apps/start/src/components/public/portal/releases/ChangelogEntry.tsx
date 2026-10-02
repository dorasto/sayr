import { cn } from "@repo/ui/lib/utils";
import { formatDate, getDisplayName } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { portalButtonVariants } from "@/components/public/portal/ui/PortalButton";
import { PortalCard } from "@/components/public/portal/ui/PortalCard";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getReleaseDisplayDate, isUpcomingStatus } from "@/lib/portal/changelog";
import { getFirstSentence } from "@/lib/portal/release-notes";
import { findTeamMemberUser } from "@/lib/portal/team";
import { ReleaseNotes } from "./ReleaseNotes";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import type { PublicRelease } from "./types";

/** Past this height the notes are clipped behind a fade and a "Read the full notes" link. */
const NOTES_MAX_HEIGHT = 320;

interface ChangelogEntryProps {
	release: PublicRelease;
	orgSlug: string;
	/** Last item of the timeline: the connector line stops at its dot. */
	isLast: boolean;
}

/** Whether the content of the (max-height capped) element overflows it. Re-measured when `content` or the width changes. */
function useIsClipped(content: string | null) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [clipped, setClipped] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `content` is what changes the rendered height
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
		check();
		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => observer.disconnect();
	}, [content]);

	return { ref, clipped };
}

/** The release lead, resolved against the org's team. Renders nothing when the lead is not on the team (or unset). */
function ReleaseLead({ leadId, ring, className }: { leadId: string | null; ring?: boolean; className?: string }) {
	const { organization } = usePublicOrganizationLayout();
	const lead = findTeamMemberUser(leadId, organization);
	if (!lead) return null;
	const name = getDisplayName(lead);

	return (
		<span className={cn("inline-flex items-center gap-2 text-[13.5px] text-portal-fg-2", className)}>
			<PortalAvatar name={name} image={lead.image} size={22} ring={ring} />
			{ring ? "Lead: " : null}
			<b className={ring ? "font-semibold text-portal-fg" : "font-normal"}>{name}</b>
		</span>
	);
}

function UpcomingCard({ release, orgSlug }: { release: PublicRelease; orgSlug: string }) {
	const { date } = getReleaseDisplayDate(release);
	const summary = getFirstSentence(release.descriptionMarkdown);

	return (
		<PortalCard padded={false} className="border-portal-accent-line px-5 py-6 md:px-8 md:py-7">
			<div className="mb-2.5 flex items-center gap-2.5">
				<span className="font-semibold text-portal-accent-ink text-xs uppercase leading-4 tracking-[0.04em]">
					Coming next
				</span>
				{date && <span className="text-[13px] text-portal-fg-3">Target {formatDate(date, "en-GB")}</span>}
			</div>
			<h2 className="font-bold text-2xl text-portal-fg leading-8 tracking-[-0.026em] md:text-[26px]">
				{release.name}
			</h2>
			{summary && <p className="mt-2 max-w-[600px] text-[15px] text-portal-fg-2 leading-6">{summary}</p>}
			<div className="mt-6 flex flex-wrap items-center gap-3">
				<ReleaseLead leadId={release.leadId} ring />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className={portalButtonVariants({ variant: "default", size: "md" })}
				>
					See progress
					<IconArrowRight aria-hidden className="size-[15px]" />
				</Link>
			</div>
		</PortalCard>
	);
}

function ReleasedCard({ release, orgSlug }: { release: PublicRelease; orgSlug: string }) {
	const { organization } = usePublicOrganizationLayout();
	const { ref, clipped } = useIsClipped(release.descriptionMarkdown);
	const hasNotes = !!release.descriptionMarkdown?.trim();

	return (
		<PortalCard padded={false} className="px-5 py-6 md:px-8 md:py-7">
			<h2 className="font-bold text-[22px] text-portal-fg leading-[30px] tracking-[-0.024em] md:text-2xl">
				{release.name}
			</h2>
			{hasNotes && (
				<div className="relative mt-1">
					<div ref={ref} className="overflow-hidden" style={{ maxHeight: NOTES_MAX_HEIGHT }}>
						<ReleaseNotes
							markdown={release.descriptionMarkdown}
							orgPrefix={organization.shortId}
							orgSlug={orgSlug}
						/>
					</div>
					{clipped && (
						<>
							<div
								aria-hidden
								className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-portal-surface"
							/>
							<div className="relative mt-1">
								<Link
									to="/orgs/$orgSlug/releases/$releaseSlug"
									params={{ orgSlug, releaseSlug: release.slug }}
									className="inline-flex items-center gap-1.5 font-medium text-[13.5px] text-portal-accent-ink max-md:min-h-11 hover:underline focus-visible:underline"
								>
									Read the full notes
									<IconArrowRight aria-hidden className="size-3.5" />
								</Link>
							</div>
						</>
					)}
				</div>
			)}
			<div className="mt-6 mb-4 h-px bg-portal-line" />
			<div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13.5px] text-portal-fg-2">
				<ReleaseLead leadId={release.leadId} />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className="inline-flex items-center gap-1.5 font-medium text-portal-accent-ink max-md:min-h-11 hover:underline focus-visible:underline"
				>
					View release
					<IconArrowRight aria-hidden className="size-3.5" />
				</Link>
			</div>
		</PortalCard>
	);
}

/**
 * One timeline entry: a 150px right-aligned rail (version = release slug, date, status chip), the connector line with
 * its dot (amber for upcoming, green for released) and the card.
 */
export function ChangelogEntry({ release, orgSlug, isLast }: ChangelogEntryProps) {
	const upcoming = isUpcomingStatus(release.status);
	const { date } = getReleaseDisplayDate(release);

	return (
		<article
			className={cn("grid grid-cols-1 gap-3 md:grid-cols-[150px_40px_1fr] md:gap-0", !isLast && "mb-8 md:mb-10")}
		>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:block md:pt-0.5 md:text-right">
				<div className="font-bold text-[22px] text-portal-fg leading-7 tracking-[-0.02em] tabular-nums">
					{release.slug}
				</div>
				<div className="text-[13px] text-portal-fg-3 md:mt-1 md:mb-2.5">
					{date ? formatDate(date, "en-GB") : "No target date"}
				</div>
				<ReleaseStatusChip status={release.status} />
			</div>
			<div
				aria-hidden
				className={cn(
					"relative hidden md:block",
					"before:absolute before:top-0 before:left-[19px] before:w-px before:bg-portal-line-2 before:content-['']",
					isLast ? "before:bottom-0" : "before:-bottom-10"
				)}
			>
				<i
					className={cn(
						"absolute top-[9px] left-3.5 block size-[11px] rounded-full border-2",
						upcoming ? "border-portal-accent bg-portal-accent" : "border-portal-ok bg-portal-ok"
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
