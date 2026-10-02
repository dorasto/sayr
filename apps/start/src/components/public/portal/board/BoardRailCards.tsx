import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { formatShortDate, pickLatestRelease } from "@/lib/portal/board-row";
import { getReleaseDate } from "@/lib/portal/status";
import { CategoryTag } from "../ui/CategoryTag";
import { Pill } from "../ui/Pill";
import { portalButtonVariants } from "../ui/PortalButton";
import { PortalCard, PortalCardTitle } from "../ui/PortalCard";
import { newPostLink } from "./new-post-path";
import { type BoardCounts, type PublicReleaseSummary, useReleaseTaskCount } from "./useBoardSideData";

interface ShareIdeaCardProps {
	orgSlug: string;
	className?: string;
}

/** "Share an idea or report a bug": the one way into posting, a link to the full form (`/orgs/$orgSlug/new`). */
export function ShareIdeaCard({ orgSlug, className }: ShareIdeaCardProps) {
	return (
		<PortalCard className={className}>
			<h2 className="mb-1 font-semibold text-[15px] text-portal-fg">Share an idea or report a bug</h2>
			<p className="mb-3.5 text-[13px] text-portal-fg-2 leading-[19px]">
				Search first. If someone already posted it, give it your vote instead.
			</p>
			<Link
				{...newPostLink(orgSlug)}
				className={cn(portalButtonVariants({ variant: "primary", size: "md" }), "w-full")}
			>
				Write a post
			</Link>
		</PortalCard>
	);
}

interface CategoriesCardProps {
	categories: ReadonlyArray<schema.categoryType>;
	counts: BoardCounts | undefined;
	activeSlug: string | null;
	onSelect: (slug: string | null) => void;
	className?: string;
}

/** "Browse by category": icon tile, name and open-post count; clicking one filters the board (click again to clear). */
export function CategoriesCard({ categories, counts, activeSlug, onSelect, className }: CategoriesCardProps) {
	if (categories.length === 0) return null;

	return (
		<PortalCard className={className}>
			<PortalCardTitle>Browse by category</PortalCardTitle>
			<ul>
				{categories.map((category) => {
					const slug = generateSlug(category.name);
					const active = activeSlug === slug;
					const count =
						counts?.categories.find((entry) => entry.id === category.id)?.count ?? (counts ? 0 : undefined);
					return (
						<li key={category.id}>
							<button
								type="button"
								aria-pressed={active}
								onClick={() => onSelect(active ? null : slug)}
								className={cn(
									"-mx-2.5 flex h-11 w-[calc(100%+1.25rem)] cursor-pointer items-center justify-between rounded-[8px] px-2.5 text-left outline-none transition-colors hover:bg-portal-hover md:h-9",
									active && "bg-portal-raised"
								)}
							>
								<CategoryTag category={category} className={cn(active && "text-portal-fg")} />
								{count !== undefined && (
									<span className="text-[13px] text-portal-fg-3 tabular-nums">{count}</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</PortalCard>
	);
}

interface LatestReleaseCardProps {
	orgSlug: string;
	releases: ReadonlyArray<PublicReleaseSummary>;
	className?: string;
}

/** "Latest release": the newest released release with its version, name, date and (when known) shipped-post count. */
export function LatestReleaseCard({ orgSlug, releases, className }: LatestReleaseCardProps) {
	const latest = useMemo(() => pickLatestRelease(releases), [releases]);
	const taskCount = useReleaseTaskCount(orgSlug, latest?.slug ?? null);

	if (!latest) return null;

	const date = formatShortDate(getReleaseDate(latest), new Date(), true);
	const shipped = taskCount === null ? null : `${taskCount} ${taskCount === 1 ? "post" : "posts"} shipped`;

	return (
		<PortalCard className={className}>
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="font-semibold text-[13px] text-portal-fg">Latest release</h3>
				<Pill variant="gh">{latest.slug}</Pill>
			</div>
			<Link
				to="/orgs/$orgSlug/releases/$releaseSlug"
				params={{ orgSlug, releaseSlug: latest.slug }}
				className="block outline-none"
			>
				<p className="font-semibold text-sm leading-[21px] tracking-[-0.006em]">{latest.name}</p>
				<p className="mt-1.5 text-[13px] text-portal-fg-3">{[date, shipped].filter(Boolean).join(" · ")}</p>
			</Link>
			<div className="my-3.5 h-px bg-portal-line" />
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className="inline-flex items-center gap-1.5 font-medium text-[13px] text-portal-accent-ink max-md:min-h-11 hover:underline focus-visible:underline"
			>
				Read the changelog
				<IconArrowRight aria-hidden className="size-3.5" />
			</Link>
		</PortalCard>
	);
}
