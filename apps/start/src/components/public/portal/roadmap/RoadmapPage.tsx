import type { schema } from "@repo/database";
import { IconBolt, IconCalendarOff, IconLoader2, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import { Page } from "@/components/generic/page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useRoadmap } from "@/hooks/portal/useRoadmap";
import { formatShortDate } from "@/lib/portal/board-row";
import { buildReleaseColumns, buildStatusColumns } from "@/lib/portal/roadmap";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { PortalButton, portalButtonVariants } from "../ui/PortalButton";
import { PortalCard } from "../ui/PortalCard";
import { StatusChip } from "../ui/StatusChip";
import { RoadmapCard } from "./RoadmapCard";
import { RoadmapColumn, RoadmapColumnSkeleton } from "./RoadmapColumn";
import { RoadmapSegmented, type RoadmapView } from "./RoadmapSegmented";
import { RoadmapErrorState } from "./RoadmapStates";

const SKELETON_COLUMNS = [0, 1, 2];

/** Release tag on a card: hidden for archived releases (nothing useful to link a reader to). */
function cardReleaseName(task: schema.TaskWithLabels, releasesById: ReadonlyMap<string, PublicReleaseSummary>) {
	const release = task.releaseId ? releasesById.get(task.releaseId) : undefined;
	return release && release.status !== "archived" ? release.name : null;
}

/** Header chip for a release column: rocket and the release name, linking to the release page. */
function ReleaseColumnTitle({ orgSlug, release }: { orgSlug: string; release: PublicReleaseSummary | null }) {
	const chip =
		"relative inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-portal-neutral-soft pr-2.5 pl-[9px] font-semibold text-[12.5px] text-portal-fg";
	if (!release) {
		return (
			<span className={chip}>
				<IconCalendarOff aria-hidden className="size-3.5" />
				Unscheduled
			</span>
		);
	}
	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug, releaseSlug: release.slug }}
			className={`${chip} outline-none after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] md:after:hidden hover:bg-portal-raised focus-visible:ring-2 focus-visible:ring-portal-focus`}
		>
			<IconRocket aria-hidden className="size-3.5" />
			{release.name}
		</Link>
	);
}

function releaseColumnDescription(release: PublicReleaseSummary | null): string {
	if (!release) return "Not attached to an upcoming release";
	const status = release.status === "in-progress" ? "In progress" : "Planned";
	const target = formatShortDate(release.targetDate);
	return target ? `${status} · target ${target}` : `${status} · no target date`;
}

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

/** The roadmap: Planned / In progress / Done recently columns of posts, or upcoming releases in "By release" mode. */
export function RoadmapPage() {
	const { organization } = usePublicOrganizationLayout();
	const roadmap = useRoadmap();
	const [view, setView] = useState<RoadmapView>("status");

	const statusColumns = useMemo(
		() => buildStatusColumns(roadmap.tasks, roadmap.releasesById),
		[roadmap.tasks, roadmap.releasesById]
	);
	const releaseColumns = useMemo(
		() => buildReleaseColumns(roadmap.tasks, roadmap.releasesById),
		[roadmap.tasks, roadmap.releasesById]
	);

	const renderCards = (tasks: ReadonlyArray<schema.TaskWithLabels>, withReleaseTag: boolean): ReactNode =>
		tasks.map((task) => (
			<RoadmapCard
				key={task.id}
				task={task}
				releaseName={withReleaseTag ? cardReleaseName(task, roadmap.releasesById) : null}
			/>
		));

	let columns: ReactNode;
	if (roadmap.isError) {
		columns = <RoadmapErrorState onRetry={roadmap.retry} />;
	} else if (roadmap.isLoading) {
		columns = (
			<div className="flex gap-5" aria-busy="true">
				<span className="sr-only">Loading the roadmap</span>
				{SKELETON_COLUMNS.map((index) => (
					<RoadmapColumnSkeleton key={index} />
				))}
			</div>
		);
	} else if (view === "status") {
		columns = (
			<div className="flex items-start gap-5">
				<RoadmapColumn
					title={<StatusChip status="todo" />}
					count={statusColumns.planned.length}
					hasMore={roadmap.capped}
					description="The team has agreed to build these"
					emptyMessage="Nothing planned yet"
				>
					{renderCards(statusColumns.planned, true)}
				</RoadmapColumn>
				<RoadmapColumn
					title={<StatusChip status="in-progress" />}
					count={statusColumns.inProgress.length}
					hasMore={roadmap.capped}
					description="Being worked on right now"
					emptyMessage="Nothing in progress right now"
				>
					{renderCards(statusColumns.inProgress, true)}
				</RoadmapColumn>
				<RoadmapColumn
					title={<StatusChip status="done" />}
					count={statusColumns.done.length}
					hasMore={roadmap.capped}
					description="Live in the last 90 days"
					emptyMessage="Nothing has shipped in the last 90 days"
				>
					{renderCards(statusColumns.done, true)}
				</RoadmapColumn>
			</div>
		);
	} else if (releaseColumns.length === 0) {
		columns = (
			<div className="flex items-start gap-5">
				<RoadmapColumn
					title={<ReleaseColumnTitle orgSlug={organization.slug} release={null} />}
					count={0}
					hasMore={roadmap.capped}
					description={releaseColumnDescription(null)}
					emptyMessage="Nothing planned or in progress yet"
				/>
			</div>
		);
	} else {
		columns = (
			<div className="flex items-start gap-5">
				{releaseColumns.map((column) => (
					<RoadmapColumn
						key={column.key}
						title={<ReleaseColumnTitle orgSlug={organization.slug} release={column.release} />}
						count={column.tasks.length}
						hasMore={roadmap.capped}
						description={releaseColumnDescription(column.release)}
						emptyMessage="No posts yet"
					>
						{renderCards(column.tasks, false)}
					</RoadmapColumn>
				))}
			</div>
		);
	}

	return (
		<Page>
			<div className="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 md:px-6 md:pt-12 xl:px-0">
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

				{/* Below 1024px the columns keep their 360px width and scroll sideways; from 1024px they share the row (300-360px each) and only scroll when there are more than fit. */}
				<div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6 xl:mx-0 xl:px-0">{columns}</div>

				{roadmap.capped && !roadmap.isError && !roadmap.isLoading && (
					<div className="mt-6 flex flex-col items-center gap-2">
						<p className="text-[13px] text-portal-fg-3">Showing the most voted posts. There may be more.</p>
						<PortalButton onClick={roadmap.showMore} disabled={roadmap.isFetchingMore} className="max-md:h-11">
							{roadmap.isFetchingMore ? (
								<>
									<IconLoader2 className="animate-spin" />
									Loading
								</>
							) : (
								"Show more"
							)}
						</PortalButton>
					</div>
				)}

				{!roadmap.isError && !roadmap.isLoading && (
					<BoardLinkCard orgSlug={organization.slug} backlogCount={roadmap.backlogCount} />
				)}
			</div>
		</Page>
	);
}
