import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getReleaseDisplayDate, isUpcomingStatus } from "@/lib/portal/changelog";
import { getFirstSentence, parseReleaseNotes, type ReleaseNoteInline } from "@/lib/portal/release-notes";
import { findTeamMemberUser } from "@/lib/portal/team";
import { ReleaseStatusChip } from "./ReleaseStatusChip";
import type { PublicRelease } from "./types";

interface ChangelogEntryProps {
	release: PublicRelease;
	orgSlug: string;
	/** Last item of the timeline: the connector line stops at its dot. */
	isLast: boolean;
}

function NoteInline({ tokens, orgSlug }: { tokens: ReadonlyArray<ReleaseNoteInline>; orgSlug: string }) {
	return (
		<>
			{tokens.map((token, index) => {
				// Tokens have no identity of their own and the list is static per render.
				const key = `${token.type}-${index}`;
				switch (token.type) {
					case "text":
						return <Fragment key={key}>{token.text}</Fragment>;
					case "bold":
						return (
							<b key={key} className="font-semibold">
								{token.text}
							</b>
						);
					case "code":
						return (
							<code key={key} className="rounded-md bg-muted px-1.5 py-px font-mono text-[0.88em]">
								{token.text}
							</code>
						);
					case "link":
						return (
							<a
								key={key}
								href={token.href}
								target="_blank"
								rel="noopener noreferrer"
								className="font-medium text-primary hover:underline focus-visible:underline"
							>
								{token.text}
							</a>
						);
					case "taskKey":
						return (
							<Link
								key={key}
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(token.shortId) }}
								className="whitespace-nowrap rounded-md bg-muted px-1.5 py-px font-semibold text-[12.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
							>
								{token.key}
							</Link>
						);
				}
			})}
		</>
	);
}

/**
 * A release's notes: section headings as small uppercase eyebrows, bullets, paragraphs, and `(SAY-69)` task keys
 * linked to the post they came from.
 */
function ReleaseNotes({
	markdown,
	orgPrefix,
	orgSlug,
}: {
	markdown: string | null;
	orgPrefix: string;
	orgSlug: string;
}) {
	const blocks = parseReleaseNotes(markdown, orgPrefix);
	if (blocks.length === 0) return null;

	return (
		<div className="text-[15px] text-foreground leading-6">
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				if (block.type === "heading") {
					return (
						<h4
							key={key}
							className="mt-5 mb-2 font-semibold text-muted-foreground text-xs uppercase leading-4 tracking-[0.04em] first:mt-0"
						>
							{block.text}
						</h4>
					);
				}
				if (block.type === "list") {
					return (
						<ul key={key} className="mb-1">
							{block.items.map((item, itemIndex) => (
								<li
									// biome-ignore lint/suspicious/noArrayIndexKey: static list parsed from markdown
									key={itemIndex}
									className="relative mb-2 pl-5 before:absolute before:top-2.5 before:left-1.5 before:size-[5px] before:rounded-full before:bg-muted-foreground before:content-['']"
								>
									<NoteInline tokens={item} orgSlug={orgSlug} />
								</li>
							))}
						</ul>
					);
				}
				return (
					<p key={key} className="mb-3 text-muted-foreground">
						<NoteInline tokens={block.inline} orgSlug={orgSlug} />
					</p>
				);
			})}
		</div>
	);
}

/** The release lead, resolved against the org's team. Renders nothing when the lead is not on the team (or unset). */
function ReleaseLead({ leadId, ring, className }: { leadId: string | null; ring?: boolean; className?: string }) {
	const { organization } = usePublicOrganizationLayout();
	const lead = findTeamMemberUser(leadId, organization);
	if (!lead) return null;
	const name = getDisplayName(lead);

	return (
		<span className={cn("inline-flex items-center gap-2 text-[13.5px] text-muted-foreground", className)}>
			<Avatar
				className={cn("size-[22px]", ring && "shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--primary)]")}
			>
				<AvatarImage src={lead.image ? ensureCdnUrl(lead.image) : undefined} alt={name} />
				<AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
			</Avatar>
			{ring ? "Lead: " : null}
			<b className={ring ? "font-semibold text-foreground" : "font-normal"}>{name}</b>
		</span>
	);
}

function UpcomingCard({ release, orgSlug }: { release: PublicRelease; orgSlug: string }) {
	const { date } = getReleaseDisplayDate(release);
	const summary = getFirstSentence(release.descriptionMarkdown);

	return (
		<Card className="rounded-xl border-primary/50 px-5 py-6 md:px-8 md:py-7">
			<div className="mb-2.5 flex items-center gap-2.5">
				<span className="font-semibold text-primary text-xs uppercase leading-4 tracking-[0.04em]">
					Coming next
				</span>
				{date && <span className="text-[13px] text-muted-foreground">Target {formatDate(date, "en-GB")}</span>}
			</div>
			<h2 className="font-bold text-2xl text-foreground leading-8 tracking-[-0.026em] md:text-[26px]">
				{release.name}
			</h2>
			{summary && <p className="mt-2 max-w-[600px] text-[15px] text-muted-foreground leading-6">{summary}</p>}
			<div className="mt-6 flex flex-wrap items-center gap-3">
				<ReleaseLead leadId={release.leadId} ring />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					See progress
					<IconArrowRight aria-hidden className="size-[15px]" />
				</Link>
			</div>
		</Card>
	);
}

function ReleasedCard({ release, orgSlug }: { release: PublicRelease; orgSlug: string }) {
	const { organization } = usePublicOrganizationLayout();
	const hasNotes = !!release.descriptionMarkdown?.trim();

	// Past 320px the notes are clipped behind a fade and a "Read the full notes" link. Re-measured when the notes or
	// the width change.
	const notesRef = useRef<HTMLDivElement | null>(null);
	const [clipped, setClipped] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `descriptionMarkdown` is what changes the rendered height
	useEffect(() => {
		const el = notesRef.current;
		if (!el) return;
		const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
		check();
		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => observer.disconnect();
	}, [release.descriptionMarkdown]);

	return (
		<Card className="rounded-xl px-5 py-6 md:px-8 md:py-7">
			<h2 className="font-bold text-[22px] text-foreground leading-[30px] tracking-[-0.024em] md:text-2xl">
				{release.name}
			</h2>
			{hasNotes && (
				<div className="relative mt-1">
					<div ref={notesRef} className="overflow-hidden" style={{ maxHeight: 320 }}>
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
								className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-card"
							/>
							<div className="relative mt-1">
								<Link
									to="/orgs/$orgSlug/releases/$releaseSlug"
									params={{ orgSlug, releaseSlug: release.slug }}
									className="inline-flex items-center gap-1.5 font-medium text-[13.5px] text-primary max-md:min-h-11 hover:underline focus-visible:underline"
								>
									Read the full notes
									<IconArrowRight aria-hidden className="size-3.5" />
								</Link>
							</div>
						</>
					)}
				</div>
			)}
			<div className="mt-6 mb-4 h-px bg-border" />
			<div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13.5px] text-muted-foreground">
				<ReleaseLead leadId={release.leadId} />
				<span className="grow" />
				<Link
					to="/orgs/$orgSlug/releases/$releaseSlug"
					params={{ orgSlug, releaseSlug: release.slug }}
					className="inline-flex items-center gap-1.5 font-medium text-primary max-md:min-h-11 hover:underline focus-visible:underline"
				>
					View release
					<IconArrowRight aria-hidden className="size-3.5" />
				</Link>
			</div>
		</Card>
	);
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
			<div
				aria-hidden
				className={cn(
					"relative hidden md:block",
					"before:absolute before:top-0 before:left-[19px] before:w-px before:bg-border before:content-['']",
					isLast ? "before:bottom-0" : "before:-bottom-10"
				)}
			>
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
