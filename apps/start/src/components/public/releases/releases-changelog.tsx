import { Button } from "@repo/ui/components/button";
import { IconRocket } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Page, type PanelConfig } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { BoardPageBar } from "@/components/public/portal/board/BoardPageBar";
import { ChangelogRail } from "@/components/public/portal/releases/ChangelogRail";
import { ReleaseCard } from "@/components/public/portal/releases/ReleaseCard";
import { fetchPublicReleases } from "@/components/public/portal/releases/types";
import { usePanelViewportDefaults } from "@/hooks/portal/usePanelViewportDefaults";
import { groupReleasesByMonth, sortReleasedReleases, sortUpcomingReleases } from "@/lib/portal/changelog";
import { ChangelogEntrySkeleton } from "./changelog-entry-skeleton";

/** How many upcoming releases are loaded per status; far above what a roadmap realistically holds. */
const UPCOMING_LIMIT = 50;
/** Released releases per page ("Show older releases" loads the next one). */
const RELEASED_PAGE_SIZE = 10;
const STALE_TIME = 1000 * 30;

const CHANGELOG_PANEL_ID = "public-changelog-panel";

/** The "Coming next" panel, sized and behaving like the Feedback board's (`BOARD_PANEL` in `public/index.tsx`). */
const CHANGELOG_PANEL: PanelConfig = {
	id: CHANGELOG_PANEL_ID,
	header: { title: "Overview", showClose: false },
	defaultOpen: true,
	persistOpenState: false,
	width: "30dvw",
	fitContent: true,
	resizable: false,
	height: "70dvh",
	minWidth: 280,
	maxWidth: 480,
	// Same chrome as the board's overview (`OVERVIEW_PANEL_VIEW` in `public/index.tsx`): no panel surface or header on
	// desktop, the tiles float beside the feed, offset to clear the page bar.
	classNames: {
		desktop: {
			popup: "bg-transparent border-transparent",
			content: "p-0 pt-11",
			header: "hidden",
		},
	},
};

interface ReleasesChangelogProps {
	orgSlug: string;
}

/**
 * Public changelog, laid out like the Feedback board: the main column is the released releases, newest first and grouped
 * by month (`ReleaseCard`s, each a link to its release page), with "Show older releases" paging through the existing
 * `page`/`hasMore` pagination; the right-hand panel (`ChangelogRail`) holds the upcoming (`planned`, `in-progress`)
 * releases with their progress. Archived releases are never requested.
 */
export function ReleasesChangelog({ orgSlug }: ReleasesChangelogProps) {
	const { setPanelContent } = usePage();
	const panel = usePanel(CHANGELOG_PANEL_ID);
	const { modal } = usePanelViewportDefaults(CHANGELOG_PANEL_ID);

	const planned = useQuery({
		queryKey: ["public-releases", orgSlug, "planned"],
		queryFn: () => fetchPublicReleases(orgSlug, "planned", 1, UPCOMING_LIMIT),
		staleTime: STALE_TIME,
	});
	const inProgress = useQuery({
		queryKey: ["public-releases", orgSlug, "in-progress"],
		queryFn: () => fetchPublicReleases(orgSlug, "in-progress", 1, UPCOMING_LIMIT),
		staleTime: STALE_TIME,
	});
	const released = useInfiniteQuery({
		queryKey: ["public-releases", orgSlug, "released"],
		queryFn: ({ pageParam }) => fetchPublicReleases(orgSlug, "released", pageParam, RELEASED_PAGE_SIZE),
		initialPageParam: 1,
		getNextPageParam: (lastPage) => (lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined),
		staleTime: STALE_TIME,
	});

	const upcomingReleases = useMemo(
		() => sortUpcomingReleases([...(planned.data?.releases ?? []), ...(inProgress.data?.releases ?? [])]),
		[planned.data, inProgress.data]
	);
	const months = useMemo(
		() => groupReleasesByMonth(sortReleasedReleases(released.data?.pages.flatMap((page) => page.releases) ?? [])),
		[released.data]
	);
	const upcomingLoading = planned.isLoading || inProgress.isLoading;

	// Memoised so the effect below only re-fires when the panel's data changes (see the page-component skill), and gated
	// on isRegistered: Page registers panels in its client-only pass.
	const panelContent = useMemo(
		() => <ChangelogRail orgSlug={orgSlug} upcoming={upcomingReleases} isLoading={upcomingLoading} />,
		[orgSlug, upcomingReleases, upcomingLoading]
	);
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(CHANGELOG_PANEL_ID, panelContent);
	}, [panel.isRegistered, setPanelContent, panelContent]);

	const panels = useMemo(() => ({ right: { ...CHANGELOG_PANEL, modal } }), [modal]);

	return (
		<Page panels={panels}>
			<BoardPageBar panelId={CHANGELOG_PANEL_ID} />
			<div className="w-full min-w-0 px-4 pb-16">
				<header className="mb-4 border-b px-1 pb-4">
					<h1 className="font-semibold! text-2xl! text-foreground tracking-tight">Changelog</h1>
					<p className="mt-1 text-muted-foreground text-sm">Everything the team has shipped.</p>
				</header>

				{released.isLoading ? (
					<div aria-busy className="flex flex-col gap-2">
						<ChangelogEntrySkeleton />
						<ChangelogEntrySkeleton />
						<ChangelogEntrySkeleton />
					</div>
				) : released.isError ? (
					<div className="mx-auto flex max-w-[340px] flex-col items-center py-16 text-center">
						<span
							aria-hidden
							className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
						>
							<IconRocket className="size-6" />
						</span>
						<div className="font-semibold text-base text-foreground">Could not load the changelog</div>
						<p className="mt-1.5 text-muted-foreground text-sm">Check your connection and try again.</p>
						<Button variant="outline" size="sm" className="mt-4" onClick={() => void released.refetch()}>
							Try again
						</Button>
					</div>
				) : months.length === 0 ? (
					<div className="mx-auto flex max-w-[340px] flex-col items-center py-16 text-center">
						<span
							aria-hidden
							className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary"
						>
							<IconRocket className="size-6" />
						</span>
						<div className="font-semibold text-base text-foreground">Nothing has shipped yet</div>
						<p className="mt-1.5 text-muted-foreground text-sm">
							Releases will show up here once the team publishes them.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-6">
						{months.map((month) => (
							<section key={month.key} aria-label={month.label} className="flex flex-col gap-2">
								<h2 className="px-1 font-medium! text-muted-foreground text-xs! leading-4! tracking-normal!">
									{month.label}
								</h2>
								{month.releases.map((release) => (
									<ReleaseCard key={release.id} release={release} orgSlug={orgSlug} />
								))}
							</section>
						))}
						{released.hasNextPage && (
							<div className="flex justify-center">
								<Button
									variant="accent"
									size="sm"
									disabled={released.isFetchingNextPage}
									onClick={() => void released.fetchNextPage()}
								>
									{released.isFetchingNextPage ? "Loading..." : "Show older releases"}
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</Page>
	);
}
