import { Button } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTab } from "@repo/ui/components/cossui/tabs";
import { IconRocket } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ChangelogEntry } from "@/components/public/portal/releases/ChangelogEntry";
import { fetchPublicReleases } from "@/components/public/portal/releases/types";
import { CHANGELOG_TABS, type ChangelogTab, sortReleasedReleases, sortUpcomingReleases } from "@/lib/portal/changelog";
import { ChangelogEntrySkeleton } from "./changelog-entry-skeleton";

/** How many upcoming releases are loaded per status; far above what a roadmap realistically holds. */
const UPCOMING_LIMIT = 50;
/** Released releases per page ("Show older releases" loads the next one). */
const RELEASED_PAGE_SIZE = 10;
const STALE_TIME = 1000 * 30;

interface ReleasesChangelogProps {
	orgSlug: string;
	tab: ChangelogTab;
	onTabChange: (tab: ChangelogTab) => void;
}

/**
 * Public changelog: a vertical timeline of releases with All / Upcoming / Released tabs. Upcoming (`planned`,
 * `in-progress`) releases come first, then released ones newest first with "Show older releases" paging through the
 * existing `page`/`hasMore` pagination. Archived releases are never requested.
 */
export function ReleasesChangelog({ orgSlug, tab, onTabChange }: ReleasesChangelogProps) {
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
	const releasedReleases = useMemo(
		() => sortReleasedReleases(released.data?.pages.flatMap((page) => page.releases) ?? []),
		[released.data]
	);

	const upcomingLoading = planned.isLoading || inProgress.isLoading;
	const countsReady = !upcomingLoading && !released.isLoading;
	const upcomingCount = (planned.data?.pagination.totalItems ?? 0) + (inProgress.data?.pagination.totalItems ?? 0);
	const releasedCount = released.data?.pages[0]?.pagination.totalItems ?? 0;
	const counts: Record<ChangelogTab, number> = {
		all: upcomingCount + releasedCount,
		upcoming: upcomingCount,
		released: releasedCount,
	};

	const showUpcoming = tab !== "released";
	const showReleased = tab !== "upcoming";
	const entries = [...(showUpcoming ? upcomingReleases : []), ...(showReleased ? releasedReleases : [])];

	const isLoading = (showUpcoming && upcomingLoading) || (showReleased && released.isLoading);
	const isError = (showUpcoming && (planned.isError || inProgress.isError)) || (showReleased && released.isError);
	const hasOlder = showReleased && !!released.hasNextPage;

	const refetchAll = () => {
		void planned.refetch();
		void inProgress.refetch();
		void released.refetch();
	};

	return (
		<div className="h-full overflow-y-auto">
			<main className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 md:px-6 md:pt-12">
				<div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-bold text-[28px] text-foreground leading-[34px] tracking-[-0.028em] md:text-[32px] md:leading-[38px]">
							Changelog
						</h1>
						<p className="mt-1 max-w-[560px] text-[15px] text-muted-foreground leading-6">
							Everything that has shipped, and what is coming next. Each release links to the posts it came from.
						</p>
					</div>
					<Tabs
						value={tab}
						onValueChange={(next) => onTabChange(String(next) as ChangelogTab)}
						className="md:w-auto"
					>
						<TabsList
							variant="underline"
							className="w-full justify-start gap-1 border-b data-[orientation=horizontal]:py-0 *:data-[slot=tabs-trigger]:hover:bg-transparent"
						>
							{CHANGELOG_TABS.map((item) => (
								<TabsTab
									key={item.value}
									value={item.value}
									className="h-10 grow-0 gap-2 rounded-none px-3 text-muted-foreground text-sm hover:text-foreground focus-visible:ring-0 data-active:text-foreground max-md:h-11 sm:h-10"
								>
									{item.label}
									{countsReady && (
										<span className="font-medium text-muted-foreground text-xs tabular-nums">
											{counts[item.value]}
										</span>
									)}
								</TabsTab>
							))}
						</TabsList>
					</Tabs>
				</div>

				{isLoading ? (
					<div aria-busy>
						<ChangelogEntrySkeleton />
						<ChangelogEntrySkeleton />
						<ChangelogEntrySkeleton />
					</div>
				) : isError ? (
					<div className="mx-auto flex max-w-[340px] flex-col items-center py-16 text-center">
						<span
							aria-hidden
							className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
						>
							<IconRocket className="size-6" />
						</span>
						<div className="font-semibold text-base text-foreground">Could not load the changelog</div>
						<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
							Check your connection and try again.
						</p>
						<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
							<Button variant="outline" size="sm" onClick={refetchAll}>
								Try again
							</Button>
						</div>
					</div>
				) : entries.length === 0 ? (
					<div className="mx-auto flex max-w-[340px] flex-col items-center py-16 text-center">
						<span
							aria-hidden
							className="mb-3.5 inline-flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary"
						>
							<IconRocket className="size-6" />
						</span>
						<div className="font-semibold text-base text-foreground">
							{tab === "upcoming" ? "Nothing is planned right now" : "No releases yet"}
						</div>
						<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">
							{tab === "upcoming"
								? "Upcoming releases will show up here once the team schedules them."
								: "Releases will show up here once the team publishes them."}
						</p>
					</div>
				) : (
					<>
						<div>
							{entries.map((release, index) => (
								<ChangelogEntry
									key={release.id}
									release={release}
									orgSlug={orgSlug}
									isLast={index === entries.length - 1 && !hasOlder}
								/>
							))}
						</div>
						{hasOlder && (
							<div className="flex justify-center">
								<Button
									variant="outline"
									size="sm"
									disabled={released.isFetchingNextPage}
									onClick={() => void released.fetchNextPage()}
								>
									{released.isFetchingNextPage ? "Loading..." : "Show older releases"}
								</Button>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
}
