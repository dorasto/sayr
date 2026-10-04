import { Button, buttonVariants } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTab } from "@repo/ui/components/cossui/tabs";
import { cn } from "@repo/ui/lib/utils";
import { IconAlertTriangle, IconBulb, IconCheck, IconChevronUp, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import { usePublicPostAbility } from "@/components/public/public-task-creator";
import { PublicTaskItem } from "@/components/public/task-item";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { type ActivityTab, useActivity } from "@/hooks/portal/useActivity";
import { formatTabCount } from "@/lib/portal/activity";
import { formatShortDate } from "@/lib/portal/board-row";
import { newPostLink } from "../board/new-post-path";
import { SegmentedProgress } from "../ui/SegmentedProgress";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityRowSkeletons } from "./ActivityRowSkeletons";

const SWATCH = {
	ok: "bg-success",
	accent: "bg-primary",
	muted: "bg-border",
	// Won't do is listed but not part of the bar: a hollow swatch says so.
	hollow: "border-[1.5px] border-muted-foreground",
} as const;

interface ActivityBodyProps {
	userId: string;
	/** One column at every width (the account dialog is too narrow for the sidebar). */
	stacked?: boolean;
}

/** The logged-in viewer's Voted / Posted tabs, plus the "Shipped because you asked" and vote-status sidebar. */
export function ActivityBody({ userId, stacked = false }: ActivityBodyProps) {
	const { organization, categories, labels } = usePublicOrganizationLayout();
	const { canPost } = usePublicPostAbility();
	const [tab, setTab] = useState<ActivityTab>("voted");
	const activity = useActivity(userId, tab);
	const orgSlug = organization.slug;

	const posts = tab === "voted" ? activity.votedPosts : activity.postedPosts;
	// The rows are the board's `Field*` components, which read their data from a (read-only) board provider.
	const boardData = useMemo<BoardDataSource>(
		() => ({ items: posts, labels, categories, releases: [] }),
		[posts, labels, categories]
	);

	let content: ReactNode;
	if (activity.isError) {
		content = (
			<div
				role="alert"
				className="flex items-center gap-3.5 rounded-xl border border-destructive/50 bg-card px-5 py-5"
			>
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
				>
					<IconAlertTriangle className="size-5" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="font-semibold text-[15px]">We could not load your activity</div>
					<div className="text-[13.5px] text-muted-foreground">Check your connection and try again.</div>
				</div>
				<Button variant="outline" onClick={activity.retry}>
					<IconRefresh aria-hidden />
					Retry
				</Button>
			</div>
		);
	} else if (activity.isLoading) {
		content = (
			<>
				<span className="sr-only">Loading your activity</span>
				<ActivityRowSkeletons />
			</>
		);
	} else if (posts.length === 0 && !activity.activeTruncated) {
		content =
			tab === "voted" ? (
				<ActivityEmpty
					className="py-14"
					icon={<IconChevronUp className="size-6" />}
					title="Nothing voted yet"
					description="Posts you vote on while logged in show up here, so you can follow what happens to them."
					actions={
						<Link to="/orgs/$orgSlug" params={{ orgSlug }} className={buttonVariants()}>
							Browse open posts
						</Link>
					}
				/>
			) : (
				<ActivityEmpty
					className="py-14"
					tone="accent"
					icon={<IconBulb className="size-6" />}
					title="You have not posted yet"
					description="Ideas and problems you share with the team show up here."
					actions={
						canPost && (
							<Link {...newPostLink(orgSlug)} className={buttonVariants()}>
								Share an idea
							</Link>
						)
					}
				/>
			);
	} else {
		content = (
			<>
				{posts.length > 0 && (
					<BoardProvider data={boardData} capabilities={READ_ONLY_CAPABILITIES}>
						<div className="flex flex-col">
							{posts.map((task) => (
								<PublicTaskItem key={task.id} task={task} compact />
							))}
						</div>
					</BoardProvider>
				)}
				{activity.activeTruncated && (
					<div className="mt-6 flex flex-col items-center gap-2">
						<p className="text-[13px] text-muted-foreground">Showing posts loaded so far. There may be more.</p>
						{activity.isLoadingMore ? (
							<span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
								<IconLoader2 aria-hidden className="size-4 animate-spin" />
								Loading
							</span>
						) : (
							activity.canLoadMore && (
								<Button variant="outline" onClick={activity.loadMore}>
									Load more posts
								</Button>
							)
						)}
					</div>
				)}
			</>
		);
	}

	const ready = !activity.isError && !activity.isLoading;
	const visibleRows = activity.statusRows.filter((row) => row.count > 0);
	const votedTotal = activity.statusRows.reduce((sum, row) => sum + row.count, 0);
	const voteSummary = visibleRows.map((row) => `${row.count} ${row.label.toLowerCase()}`).join(", ");

	return (
		<div className={cn("flex flex-col gap-10", !stacked && "lg:flex-row lg:items-start")}>
			<section className="min-w-0 flex-1">
				<Tabs
					className="mb-4"
					value={tab}
					onValueChange={(value) => setTab(value === "posted" ? "posted" : "voted")}
				>
					<TabsList variant="underline" className="w-full justify-start border-b">
						<TabsTab value="voted" className="grow-0 gap-2">
							Voted
							{ready && (
								<span className="font-medium text-muted-foreground text-xs tabular-nums">
									{formatTabCount(activity.votedPosts.length, activity.votedTruncated)}
								</span>
							)}
						</TabsTab>
						<TabsTab value="posted" className="grow-0 gap-2">
							Posted
							{ready && (
								<span className="font-medium text-muted-foreground text-xs tabular-nums">
									{formatTabCount(activity.postedPosts.length, activity.postedTruncated)}
								</span>
							)}
						</TabsTab>
					</TabsList>
				</Tabs>
				{content}
			</section>

			{ready && (activity.shipped.length > 0 || activity.votedPosts.length > 0) && (
				<aside className={cn("flex w-full shrink-0 flex-col gap-4", !stacked && "lg:w-[300px] xl:w-80")}>
					{activity.shipped.length > 0 && (
						<div className="rounded-xl border bg-card p-5">
							<h3 className="mb-3 font-semibold! text-[13px]! text-foreground">Shipped because you asked</h3>
							<ul className="flex flex-col gap-4">
								{activity.shipped.map(({ task, release, date }) => {
									const releasedOn = formatShortDate(date);
									return (
										<li key={task.id}>
											<Link
												to="/orgs/$orgSlug/$shortId"
												params={{ orgSlug, shortId: String(task.shortId) }}
												className="flex items-start gap-3 rounded-lg outline-none"
											>
												<span
													aria-hidden
													className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success"
												>
													<IconCheck className="size-4" stroke={2.6} />
												</span>
												<span className="min-w-0">
													<span className="block font-semibold text-[14px] text-foreground leading-5">
														{task.title}
													</span>
													<span className="mt-1 block text-[13px] text-muted-foreground">
														Released in {release.name}
														{releasedOn && ` · ${releasedOn}`}
													</span>
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						</div>
					)}
					{votedTotal > 0 && (
						<div className="rounded-xl border bg-card p-5">
							<h3 className="mb-3 font-semibold! text-[13px]! text-foreground">Where your votes stand</h3>
							<SegmentedProgress
								segments={activity.barSegments}
								label={`Your voted posts: ${voteSummary}`}
								className="mb-3.5 h-2"
							/>
							<ul className="flex flex-col gap-2 text-[13.5px]">
								{visibleRows.map((row) => (
									<li key={row.status} className="flex items-center justify-between">
										<span className="inline-flex items-center gap-2 text-foreground">
											<i
												aria-hidden
												className={cn("block size-2 shrink-0 rounded-[3px]", SWATCH[row.tone])}
											/>
											{row.label}
										</span>
										<span className="text-muted-foreground tabular-nums">{row.count}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</aside>
			)}
		</div>
	);
}
