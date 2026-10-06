import { IconLock, IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LabelChip, Person, Priority, Status } from "./atoms";
import { DEMO_TASKS, type DemoStatus, type DemoTask, STATUS_LABEL, STATUS_ORDER } from "./demo-data";

const HEADER_H = 36;
const ROW_H = 40;
const MOVE = "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

function VisibilityMark({ task }: { task: DemoTask }) {
	return task.visible === "public" ? (
		<IconWorld className="size-3.5 shrink-0 text-primary" aria-label="Public" />
	) : (
		<IconLock className="size-3.5 shrink-0 text-muted-foreground/60" aria-label="Private" />
	);
}

interface ListRowProps {
	task: DemoTask;
	highlighted: boolean;
	note?: ReactNode;
}

function ListRow({ task, highlighted, note }: ListRowProps) {
	return (
		<div
			className={cn(
				"flex h-10 items-center gap-3 border-b px-4 text-[13px] transition-colors duration-500",
				highlighted ? "bg-primary/10" : "bg-background"
			)}
		>
			<Priority priority={task.priority} />
			<span className="w-16 shrink-0 text-muted-foreground text-xs tabular-nums">{task.key}</span>
			<Status status={task.status} />
			<span className="min-w-0 flex-1 truncate">{task.title}</span>
			{highlighted && note}
			<span className="hidden items-center gap-1 xl:flex">
				{task.labels.map((label) => (
					<LabelChip key={label.name} label={label} />
				))}
			</span>
			<VisibilityMark task={task} />
			{task.assignee ? (
				<Person person={task.assignee} />
			) : (
				<span className="size-5 rounded-full border border-dashed" />
			)}
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
	/** Extra content on the highlighted row (a vote count, a release chip). */
	highlightNote?: ReactNode;
}

/**
 * The board's list view, grouped by status like the app's default. Rows and
 * headers are absolutely positioned and moved with a transform, so when a
 * task changes status it slides into its new group instead of re-rendering.
 */
export function BoardList({ tasks = DEMO_TASKS, groups, highlightKey, highlightNote }: BoardListProps) {
	const visibleGroups = STATUS_ORDER.filter((status) =>
		groups ? groups.includes(status) : tasks.some((task) => task.status === status)
	);

	const headers: { status: DemoStatus; y: number; count: number }[] = [];
	const rows: { task: DemoTask; y: number }[] = [];
	let y = 0;
	for (const status of visibleGroups) {
		const group = tasks.filter((task) => task.status === status);
		headers.push({ status, y, count: group.length });
		y += HEADER_H;
		for (const task of group) {
			rows.push({ task, y });
			y += ROW_H;
		}
	}

	return (
		<div className="relative transition-[height] duration-700" style={{ height: y }}>
			{headers.map((header) => (
				<div
					key={header.status}
					className={cn("absolute inset-x-0 flex h-9 items-center gap-2 bg-accent/30 px-4 text-xs", MOVE)}
					style={{ transform: `translateY(${header.y}px)` }}
				>
					<Status status={header.status} size={14} />
					<span className="font-medium">{STATUS_LABEL[header.status]}</span>
					<span className="text-muted-foreground tabular-nums">{header.count}</span>
				</div>
			))}
			{rows.map((row) => (
				<div
					key={row.task.key}
					className={cn("absolute inset-x-0", MOVE)}
					style={{ transform: `translateY(${row.y}px)` }}
				>
					<ListRow task={row.task} highlighted={row.task.key === highlightKey} note={highlightNote} />
				</div>
			))}
		</div>
	);
}
