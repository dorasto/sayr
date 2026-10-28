import { IconChevronDown, IconLock } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CategoryChip, LabelChip, OrgMark, Person, Priority, ReleaseChip, Status } from "./atoms";
import { DEMO_TASKS, type DemoStatus, type DemoTask, STATUS_LABEL, STATUS_ORDER } from "./demo-data";

// Recreates the new board's list view (apps/start/src/components/board/views:
// board-row.tsx, group-header.tsx, board-list-view.tsx). Row and header
// heights are fixed so rows can be positioned with transforms and slide
// between groups when a task's status changes.

const ROW_H = 28;
const HEADER_H = 28;
/** board-list-view puts mt-3 between sections. */
const SECTION_GAP = 12;
const MOVE = "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

/** STATUS_TONE_CLASSES from the board's groupings config. */
const STATUS_TONE: Record<DemoStatus, string> = {
	backlog: "bg-muted/50",
	todo: "bg-muted",
	"in-progress": "bg-primary/5",
	done: "bg-success/5",
};

function GroupHeader({ status, count }: { status: DemoStatus; count: number }) {
	return (
		<div className="overflow-hidden rounded-xl bg-background">
			<div className={cn("flex items-center gap-1.5 px-2 py-1.5", STATUS_TONE[status])}>
				<span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
					<IconChevronDown className="size-3.5 text-muted-foreground" />
				</span>
				<Status status={status} />
				<span className="font-medium text-xs">{STATUS_LABEL[status]}</span>
				<span className="text-muted-foreground text-xs tabular-nums">{count}</span>
			</div>
		</div>
	);
}

interface BoardRowProps {
	task: DemoTask;
	highlighted: boolean;
	note?: ReactNode;
	showBadges: boolean;
}

/** board-row.tsx: checkbox gutter, status, priority, org + key, title, badges, assignee. */
function BoardRow({ task, highlighted, note, showBadges }: BoardRowProps) {
	return (
		<div
			className={cn(
				"flex h-7 items-center gap-1.5 rounded-xl px-2 text-xs transition-colors duration-500",
				highlighted && "bg-primary/10"
			)}
		>
			<span aria-hidden className="h-3.5 w-3.5 shrink-0" />
			<span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
				<Status status={task.status} />
			</span>
			<span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
				<Priority priority={task.priority} />
			</span>
			<span className="flex w-20 shrink-0 items-center gap-1">
				<OrgMark />
				<span className="truncate font-medium text-muted-foreground text-xs">{task.key}</span>
			</span>
			<span
				className={cn(
					"flex min-w-0 flex-1 items-center truncate text-foreground text-sm",
					task.status === "done" && "text-muted-foreground"
				)}
			>
				{task.visible === "private" && <IconLock className="mr-1 size-3.5 shrink-0 text-primary" />}
				<span className="truncate">{task.title}</span>
			</span>
			{highlighted && note}
			{showBadges && (
				<span className="hidden min-w-0 max-w-[40%] shrink items-center gap-1 overflow-hidden md:flex">
					<CategoryChip category={task.category} />
					{task.release && <ReleaseChip release={task.release} />}
					{task.labels.slice(0, 1).map((label) => (
						<LabelChip key={label.name} label={label} />
					))}
				</span>
			)}
			<span className="shrink-0">
				{task.assignee ? (
					<Person person={task.assignee} />
				) : (
					<span className="inline-flex size-5 rounded-full bg-accent" />
				)}
			</span>
		</div>
	);
}

interface BoardListProps {
	/** Tasks to show; defaults to the demo workspace. */
	tasks?: DemoTask[];
	/**
	 * Status groups to render even when empty (with a 0 count). Keeping a
	 * group's header mounted means a task moving in or out slides instead of
	 * the header popping in. Defaults to the groups that have tasks.
	 */
	groups?: DemoStatus[];
	/** Key of a row to tint, e.g. the task a demo is following. */
	highlightKey?: string;
	/** Extra content on the highlighted row (a vote count, a PR). */
	highlightNote?: ReactNode;
	/** Category, release and label badges; hide them where something overlaps the row's right side. */
	showBadges?: boolean;
}

/**
 * The new board's list view, grouped by status. Rows and headers are
 * absolutely positioned and moved with a transform, so when a task changes
 * status it slides into its new group instead of re-rendering.
 */
export function BoardList({
	tasks = DEMO_TASKS,
	groups,
	highlightKey,
	highlightNote,
	showBadges = true,
}: BoardListProps) {
	const visibleGroups = STATUS_ORDER.filter((status) =>
		groups ? groups.includes(status) : tasks.some((task) => task.status === status)
	);

	const headers: { status: DemoStatus; y: number; count: number }[] = [];
	const rows: { task: DemoTask; y: number }[] = [];
	let y = 0;
	visibleGroups.forEach((status, index) => {
		if (index > 0) y += SECTION_GAP;
		const group = tasks.filter((task) => task.status === status);
		headers.push({ status, y, count: group.length });
		y += HEADER_H;
		for (const task of group) {
			rows.push({ task, y });
			y += ROW_H;
		}
	});

	return (
		<div className="p-3">
			<div className="relative transition-[height] duration-700" style={{ height: y }}>
				{headers.map((header) => (
					<div
						key={header.status}
						className={cn("absolute inset-x-0", MOVE)}
						style={{ transform: `translateY(${header.y}px)` }}
					>
						<GroupHeader status={header.status} count={header.count} />
					</div>
				))}
				{rows.map((row) => (
					<div
						key={row.task.key}
						className={cn("absolute inset-x-0", MOVE)}
						style={{ transform: `translateY(${row.y}px)` }}
					>
						<BoardRow
							task={row.task}
							highlighted={row.task.key === highlightKey}
							note={highlightNote}
							showBadges={showBadges}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
