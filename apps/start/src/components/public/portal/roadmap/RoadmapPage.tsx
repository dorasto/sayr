import { cn } from "@repo/ui/lib/utils";
import { IconBolt } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { Page } from "@/components/generic/page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useRoadmap } from "@/hooks/portal/useRoadmap";
import { portalButtonVariants } from "../ui/PortalButton";
import { PORTAL_BODY } from "../ui/column";
import { PortalCard } from "../ui/PortalCard";
import { RoadmapColumnSkeleton } from "./RoadmapColumn";
import { RoadmapSegmented, type RoadmapView } from "./RoadmapSegmented";
import { RoadmapErrorState } from "./RoadmapStates";
import { RoadmapBoard } from "./roadmap-board";

const SKELETON_COLUMNS = [0, 1, 2];

/** The "N open posts are waiting for votes" card at the foot of the roadmap, linking back to the board. */
function BoardLinkCard({ orgSlug, backlogCount }: { orgSlug: string; backlogCount: number | null }) {
	let description: string;
	if (backlogCount === null) {
		description = "Open posts are waiting for votes. The most wanted ones are reviewed first.";
	} else if (backlogCount === 0) {
		description = "No open posts are waiting for votes right now. Share an idea on the board.";
	} else {
		const subject = backlogCount === 1 ? "1 open post is" : `${backlogCount} open posts are`;
		description = `${subject} waiting for votes. The most wanted ones are reviewed first.`;
	}

	return (
		<PortalCard padded={false} className="mt-10 flex flex-wrap items-center gap-4 px-6 py-5">
			<span
				aria-hidden
				className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-portal-raised text-portal-fg-2"
			>
				<IconBolt className="size-5" stroke={1.75} />
			</span>
			<div className="min-w-0 flex-1 basis-60">
				<div className="font-semibold text-[15px]">Not here? It might still be open.</div>
				<div className="mt-0.5 text-[13.5px] text-portal-fg-2">{description}</div>
			</div>
			<Link to="/orgs/$orgSlug" params={{ orgSlug }} className={portalButtonVariants({ variant: "default" })}>
				Browse open posts
			</Link>
		</PortalCard>
	);
}

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
		columns = <RoadmapErrorState onRetry={roadmap.retry} />;
	} else if (roadmap.isLoading) {
		columns = (
			<div className="flex gap-3 overflow-x-auto" aria-busy="true">
				<span className="sr-only">Loading the roadmap</span>
				{SKELETON_COLUMNS.map((index) => (
					<RoadmapColumnSkeleton key={index} />
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

	return (
		<Page>
			<div className={cn(PORTAL_BODY, "pt-8 pb-16 md:pt-12")}>
				<div className="mb-8 flex flex-col gap-4 md:mb-9 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-bold text-[28px] leading-[34px] tracking-[-0.028em] md:text-[32px] md:leading-[38px]">
							Roadmap
						</h1>
						<p className="mt-1 max-w-[620px] text-[15px] text-portal-fg-2 leading-6">
							What the team is planning, building and has just shipped. Open posts join the roadmap once the team
							commits to them.
						</p>
					</div>
					<RoadmapSegmented value={view} onChange={setView} className="self-start md:self-auto" />
				</div>

				{/* The board scrolls sideways itself: columns are at least 280px wide and share the row, so a phone (or more
				    columns than fit) scrolls horizontally inside this block. */}
				{columns}

				{!roadmap.isError && !roadmap.isLoading && (
					<BoardLinkCard orgSlug={organization.slug} backlogCount={roadmap.backlogCount} />
				)}
			</div>
		</Page>
	);
}
