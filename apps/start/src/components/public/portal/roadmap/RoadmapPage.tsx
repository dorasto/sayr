import { Button, buttonVariants } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsList, TabsTab } from "@repo/ui/components/cossui/tabs";
import { IconAlertTriangle, IconBolt, IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { Page } from "@/components/generic/page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useRoadmap } from "@/hooks/portal/useRoadmap";
import { RoadmapBoard, type RoadmapView } from "./roadmap-board";

const SKELETON_COLUMNS = [0, 1, 2];

/**
 * The roadmap: Planned / In progress / Done recently columns of posts, or upcoming releases in "By release" mode.
 * The columns are the admin board's kanban (see `RoadmapBoard`); this page owns the data, the heading and the
 * loading/error states around it.
 */
export function RoadmapPage() {
	const { organization } = usePublicOrganizationLayout();
	const roadmap = useRoadmap();
	const [view, setView] = useState<RoadmapView>("status");

	let columns: ReactNode;
	if (roadmap.isError) {
		columns = (
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
					<div className="font-semibold text-[15px]">We could not load the roadmap</div>
					<div className="text-[13.5px] text-muted-foreground">Check your connection and try again.</div>
				</div>
				<Button variant="outline" onClick={roadmap.retry}>
					<IconRefresh aria-hidden />
					Retry
				</Button>
			</div>
		);
	} else if (roadmap.isLoading) {
		// Same footprint as a board kanban column.
		columns = (
			<div className="flex gap-3 overflow-x-auto" aria-busy="true">
				<span className="sr-only">Loading the roadmap</span>
				{SKELETON_COLUMNS.map((index) => (
					<section key={index} aria-hidden className="min-w-[280px] flex-1">
						<div className="flex items-center gap-2.5 px-3.5 py-2.5">
							<Skeleton className="h-6 w-24 rounded-full" />
						</div>
						<Skeleton className="mx-3.5 mb-3 h-4 w-48" />
						<div className="flex flex-col gap-2.5 rounded-b-xl bg-background p-2.5">
							{["76%", "58%", "84%"].map((width) => (
								<div key={width} className="rounded-lg border bg-card px-4 py-3.5">
									<Skeleton className="mb-3 h-3.5 w-14" />
									<Skeleton className="h-4" style={{ width }} />
									<Skeleton className="mt-4 h-3.5 w-28" />
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		);
	} else {
		columns = (
			<RoadmapBoard
				view={view}
				tasks={roadmap.tasks}
				releasesById={roadmap.releasesById}
				capped={roadmap.capped}
				isFetchingMore={roadmap.isFetchingMore}
				onShowMore={roadmap.showMore}
			/>
		);
	}

	const backlogCount = roadmap.backlogCount;
	let boardLinkDescription: string;
	if (backlogCount === null) {
		boardLinkDescription = "Open posts are waiting for votes. The most wanted ones are reviewed first.";
	} else if (backlogCount === 0) {
		boardLinkDescription = "No open posts are waiting for votes right now. Share an idea on the board.";
	} else {
		const subject = backlogCount === 1 ? "1 open post is" : `${backlogCount} open posts are`;
		boardLinkDescription = `${subject} waiting for votes. The most wanted ones are reviewed first.`;
	}

	return (
		<Page>
			<div className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 md:px-6 md:pt-12">
				<div className="mb-8 flex flex-col gap-4 md:mb-9 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-bold text-[28px] leading-[34px] tracking-[-0.028em] md:text-[32px] md:leading-[38px]">
							Roadmap
						</h1>
						<p className="mt-1 max-w-[620px] text-[15px] text-muted-foreground leading-6">
							What the team is planning, building and has just shipped. Open posts join the roadmap once the team
							commits to them.
						</p>
					</div>
					<Tabs
						value={view}
						onValueChange={(value) => setView(value === "release" ? "release" : "status")}
						className="self-start md:self-auto"
					>
						<TabsList>
							<TabsTab value="status">By status</TabsTab>
							<TabsTab value="release">By release</TabsTab>
						</TabsList>
					</Tabs>
				</div>

				{/* The board scrolls sideways itself: columns are at least 280px wide and share the row, so a phone (or more
				    columns than fit) scrolls horizontally inside this block. */}
				{columns}

				{!roadmap.isError && !roadmap.isLoading && (
					<div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl border bg-card px-6 py-5">
						<span
							aria-hidden
							className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
						>
							<IconBolt className="size-5" stroke={1.75} />
						</span>
						<div className="min-w-0 flex-1 basis-60">
							<div className="font-semibold text-[15px]">Not here? It might still be open.</div>
							<div className="mt-0.5 text-[13.5px] text-muted-foreground">{boardLinkDescription}</div>
						</div>
						<Link
							to="/orgs/$orgSlug"
							params={{ orgSlug: organization.slug }}
							className={buttonVariants({ variant: "outline" })}
						>
							Browse open posts
						</Link>
					</div>
				)}
			</div>
		</Page>
	);
}
