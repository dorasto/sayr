import { cn } from "@repo/ui/lib/utils";
import { Skeleton } from "@repo/ui/components/skeleton";
import { IconRocket } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ChangelogEntry } from "@/components/public/portal/releases/ChangelogEntry";
import { fetchPublicReleases } from "@/components/public/portal/releases/types";
import { EmptyState } from "@/components/public/portal/ui/EmptyState";
import { PORTAL_BODY } from "@/components/public/portal/ui/column";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import { PortalTabs } from "@/components/public/portal/ui/PortalTabs";
import { CHANGELOG_TABS, type ChangelogTab, sortReleasedReleases, sortUpcomingReleases } from "@/lib/portal/changelog";

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

function EntrySkeleton() {
	return (
		<div aria-hidden className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-[150px_40px_1fr] md:gap-0">
			<div className="flex flex-col items-start gap-2 md:items-end">
				<Skeleton className="h-7 w-16 rounded-portal-tag bg-portal-raised" />
				<Skeleton className="h-4 w-24 rounded-portal-tag bg-portal-raised" />
				<Skeleton className="h-6 w-20 rounded-full bg-portal-raised" />
			</div>
			<div className="hidden md:block" />
			<Skeleton className="h-44 rounded-portal-lg bg-portal-raised" />
		</div>
	);
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
			<main className={cn(PORTAL_BODY, "pt-8 pb-16 md:pt-12")}>
				<div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-bold text-[28px] text-portal-fg leading-[34px] tracking-[-0.028em] md:text-[32px] md:leading-[38px]">
							Changelog
						</h1>
						<p className="mt-1 max-w-[560px] text-[15px] text-portal-fg-2 leading-6">
							Everything that has shipped, and what is coming next. Each release links to the posts it came from.
						</p>
					</div>
					<PortalTabs
						value={tab}
						onValueChange={(next) => onTabChange(next as ChangelogTab)}
						items={CHANGELOG_TABS.map((item) => ({
							value: item.value,
							label: item.label,
							count: countsReady ? counts[item.value] : undefined,
						}))}
						className="md:w-auto"
					/>
				</div>

				{isLoading ? (
					<div aria-busy>
						<EntrySkeleton />
						<EntrySkeleton />
						<EntrySkeleton />
					</div>
				) : isError ? (
					<EmptyState
						icon={<IconRocket className="size-6" />}
						title="Could not load the changelog"
						description="Check your connection and try again."
						actions={
							<PortalButton variant="default" onClick={refetchAll}>
								Try again
							</PortalButton>
						}
						className="py-16"
					/>
				) : entries.length === 0 ? (
					<EmptyState
						icon={<IconRocket className="size-6" />}
						tone="accent"
						title={tab === "upcoming" ? "Nothing is planned right now" : "No releases yet"}
						description={
							tab === "upcoming"
								? "Upcoming releases will show up here once the team schedules them."
								: "Releases will show up here once the team publishes them."
						}
						className="py-16"
					/>
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
								<PortalButton
									variant="default"
									disabled={released.isFetchingNextPage}
									onClick={() => void released.fetchNextPage()}
								>
									{released.isFetchingNextPage ? "Loading..." : "Show older releases"}
								</PortalButton>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
}
