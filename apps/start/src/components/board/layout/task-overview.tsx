import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import {
	type ProgressSegment,
	progressToneClass,
	SegmentedProgress,
} from "@/components/public/portal/ui/SegmentedProgress";
import { useBoardData, useBoardOpenItemClick, useBoardOrganizationScope } from "../core/board-data";
import type { TaskItem } from "../core/board-item";
import { areFiltersEqual } from "../core/view-config";
import type { FilterState } from "../filter/types";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardCardVotes } from "../views/board-card";
import {
	countOpenTasksByStatus,
	formatTaskAttentionReason,
	type OpenTaskStatus,
	selectMostVotedTasks,
	selectTasksNeedingAttention,
} from "./task-overview-model";

// The task side panels' shared pieces (an org's tasks page and /home): the compact count tiles and the overview
// sections underneath them. Each page builds its own tiles; the sections read everything from board context.

interface CountTileProps {
	active: boolean;
	onClick: () => void;
	icon: ReactNode;
	title: string;
	count: number;
}

/** One of a task panel's compact count tiles — the releases panel's status-tile styling. */
export function CountTile({ active, onClick, icon, title, count }: CountTileProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-foreground transition-colors",
				active ? "bg-accent" : "bg-accent/40 hover:bg-accent"
			)}
		>
			<span className={cn("flex shrink-0", active ? "text-foreground" : "text-muted-foreground")}>{icon}</span>
			<span className="min-w-0 truncate">{title}</span>
			<span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{count}</span>
		</button>
	);
}

/**
 * The tiles' filter behaviour: "all" is active with no view and no filters (clicking it clears the view); a preset
 * is active while there's no view and the live filters equal it, and clicking it toggles it on/off.
 */
export function usePresetTiles() {
	const { filters, viewSlug, clearView, applyFilter } = useBoardViewState();
	const isAllActive = !viewSlug && filters.groups.length === 0;
	const isPresetActive = (preset: FilterState) => !viewSlug && areFiltersEqual(filters, preset);
	const togglePreset = (preset: FilterState) => {
		if (isPresetActive(preset)) clearView();
		else applyFilter(preset);
	};
	return { isAllActive, isPresetActive, togglePreset, clearView };
}

/** A labelled panel section (as on the releases panel). */
function PanelSection({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-0.5">
			{/* Not an h3: the app's global heading styles would blow it up (see the ui-design-system skill). */}
			<div className="flex px-1.5 pb-1 text-[11px] text-muted-foreground">
				{label}
				{count !== undefined && <span className="ml-auto tabular-nums">{count}</span>}
			</div>
			{children}
		</section>
	);
}

const OPEN_WORK_SEGMENTS: { status: OpenTaskStatus; label: string; tone: ProgressSegment["tone"] }[] = [
	{ status: "backlog", label: "Backlog", tone: "muted" },
	{ status: "todo", label: "Todo", tone: "neutral" },
	{ status: "in-progress", label: "In progress", tone: "accent" },
];

function OpenWork({ counts }: { counts: Record<OpenTaskStatus, number> }) {
	const total = counts.backlog + counts.todo + counts["in-progress"];
	if (total === 0) return null;
	return (
		<PanelSection label="Open work" count={total}>
			<SegmentedProgress
				className="mx-1.5 h-1.5"
				label={OPEN_WORK_SEGMENTS.map(({ status, label }) => `${label} ${counts[status]}`).join(", ")}
				segments={OPEN_WORK_SEGMENTS.map(({ status, tone }) => ({ value: counts[status], tone }))}
			/>
			<div className="flex flex-wrap gap-x-2.5 gap-y-1 px-1.5 pt-1.5 text-[11px] text-muted-foreground">
				{OPEN_WORK_SEGMENTS.map(({ status, label, tone }) => (
					<span key={status} className="inline-flex items-center gap-1 tabular-nums">
						<span className={cn("size-1.5 shrink-0 rounded-full", progressToneClass(tone))} aria-hidden />
						{label} {counts[status]}
					</span>
				))}
			</div>
		</PanelSection>
	);
}

/**
 * One task row: key, title, and a muted trailing detail. Behaves like a board row (opens in the dialog if set).
 * The key uses the board's org scope, else the task's own org (cross-org boards).
 */
function TaskRow({ task, trailing }: { task: TaskItem; trailing: ReactNode }) {
	const openItemClick = useBoardOpenItemClick();
	const organizationScope = useBoardOrganizationScope();
	const orgShortId = organizationScope?.shortId ?? task.organization?.shortId;
	return (
		<Link
			to="/$orgId/tasks/$taskShortId"
			params={{ orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() }}
			onClick={(event) => openItemClick(task, event)}
			className="flex h-7 min-w-0 items-center gap-2 rounded-lg px-1.5 text-xs hover:bg-accent"
		>
			{orgShortId && (
				<span className="w-12 shrink-0 truncate tabular-nums text-[11px] text-muted-foreground">
					{formatTaskKey(orgShortId, task.shortId)}
				</span>
			)}
			<span className="min-w-0 flex-1 truncate">{task.title || "Untitled"}</span>
			<span className="flex shrink-0 items-center text-[11px] text-muted-foreground">{trailing}</span>
		</Link>
	);
}

/**
 * The overview sections under a task panel's tiles: open work by status, needs attention (urgent/high tasks
 * unassigned or gone quiet), most voted. Reads every task the board has, not its filtered set; each section hides
 * itself when it has nothing to show.
 */
export function TaskOverviewSections() {
	const { items } = useBoardData();
	const openByStatus = useMemo(() => countOpenTasksByStatus(items), [items]);
	const attention = useMemo(() => selectTasksNeedingAttention(items, new Date()), [items]);
	const mostVoted = useMemo(() => selectMostVotedTasks(items), [items]);

	return (
		<>
			<OpenWork counts={openByStatus} />

			{attention.length > 0 && (
				<PanelSection label="Needs attention" count={attention.length}>
					{attention.map(({ task, reason }) => (
						<TaskRow key={task.id} task={task} trailing={formatTaskAttentionReason(reason)} />
					))}
				</PanelSection>
			)}

			{mostVoted.length > 0 && (
				<PanelSection label="Most voted">
					{mostVoted.map((task) => (
						<TaskRow key={task.id} task={task} trailing={<BoardCardVotes count={task.voteCount} />} />
					))}
				</PanelSection>
			)}
		</>
	);
}
