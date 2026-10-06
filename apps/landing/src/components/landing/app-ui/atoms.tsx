import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconAlertSquareFilled } from "@tabler/icons-react";
import type { DemoLabel, DemoPerson, DemoPriority, DemoStatus } from "./demo-data";

// Small pieces shared by the admin-app recreations. Status and priority icons
// are the app's own (`@repo/ui/components/icons`), so the recreations match.

const STATUS_CLASS: Record<DemoStatus, string> = {
	backlog: "text-muted-foreground",
	todo: "text-foreground",
	"in-progress": "text-primary fill-primary",
	done: "text-success",
};

export function Status({ status, size = 16 }: { status: DemoStatus; size?: number }) {
	return <StatusIcon status={status} size={size} className={STATUS_CLASS[status]} />;
}

const PRIORITY_BARS: Record<Exclude<DemoPriority, "urgent">, 1 | 2 | 3 | "none"> = {
	low: 1,
	medium: 2,
	high: 3,
	none: "none",
};

export function Priority({ priority, size = 16 }: { priority: DemoPriority; size?: number }) {
	if (priority === "urgent") return <IconAlertSquareFilled size={size} className="text-destructive" />;
	return <PriorityIcon bars={PRIORITY_BARS[priority]} size={size} />;
}

export function LabelChip({ label }: { label: DemoLabel }) {
	return (
		<span className="inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] text-muted-foreground">
			<span className="size-1.5 rounded-full" style={{ background: label.color }} />
			{label.name}
		</span>
	);
}

export function Person({ person, size = 20 }: { person: DemoPerson; size?: number }) {
	return (
		<span
			title={person.name}
			className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[9px] text-white"
			style={{ width: size, height: size, background: person.color }}
		>
			{person.initials}
		</span>
	);
}

export function VoteChip({ votes }: { votes: number }) {
	return (
		<span className="inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] tabular-nums">
			<span aria-hidden>▲</span>
			{votes}
		</span>
	);
}
