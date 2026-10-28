import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconAlertSquareFilled, IconRocket } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
	type DemoCategory,
	type DemoLabel,
	type DemoPerson,
	type DemoPriority,
	type DemoStatus,
	ORG,
} from "./demo-data";

// Small pieces shared by the admin-app recreations, matching the board's own
// field components (apps/start/src/components/board/fields). Status and
// priority icons are the app's own (`@repo/ui/components/icons`).

const STATUS_CLASS: Record<DemoStatus, string> = {
	backlog: "text-muted-foreground",
	todo: "text-foreground",
	"in-progress": "text-primary fill-primary",
	done: "text-success",
};

export function Status({ status, size = 14 }: { status: DemoStatus; size?: number }) {
	return <StatusIcon status={status} size={size} className={STATUS_CLASS[status]} />;
}

const PRIORITY_BARS: Record<Exclude<DemoPriority, "urgent">, 1 | 2 | 3 | "none"> = {
	low: 1,
	medium: 2,
	high: 3,
	none: "none",
};

export function Priority({ priority, size = 14 }: { priority: DemoPriority; size?: number }) {
	if (priority === "urgent") return <IconAlertSquareFilled size={size} className="text-destructive" />;
	return <PriorityIcon bars={PRIORITY_BARS[priority]} size={size} />;
}

/** The board's secondary badge (FieldLabel / FieldCategory / FieldRelease): h-5, 11px, medium. */
function FieldBadge({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 max-w-24 shrink-0 items-center gap-1 rounded-md bg-secondary px-1.5 font-medium text-[11px] text-secondary-foreground",
				className
			)}
		>
			{children}
		</span>
	);
}

export function LabelChip({ label }: { label: DemoLabel }) {
	return (
		<FieldBadge className="max-w-20">
			<span className="size-1.5 shrink-0 rounded-full" style={{ background: label.color }} />
			<span className="truncate">{label.name}</span>
		</FieldBadge>
	);
}

export function CategoryChip({ category }: { category: DemoCategory }) {
	return (
		<FieldBadge>
			<span className="size-2 shrink-0 rounded-sm" style={{ background: category.color }} />
			<span className="truncate">{category.name}</span>
		</FieldBadge>
	);
}

export function ReleaseChip({ release }: { release: string }) {
	return (
		<FieldBadge>
			<IconRocket className="size-2.5 shrink-0 text-primary" />
			<span className="truncate">{release}</span>
		</FieldBadge>
	);
}

export function Person({ person, size = 20 }: { person: DemoPerson; size?: number }) {
	return (
		<span
			title={person.name}
			className="inline-flex shrink-0 items-center justify-center rounded-full border border-background font-semibold text-[9px] text-white"
			style={{ width: size, height: size, background: person.color }}
		>
			{person.initials}
		</span>
	);
}

/** The org's logo square, as rows and the sidebar show it (Doras's mark, here its initial). */
export function OrgMark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-sm bg-primary font-bold text-[8px] text-primary-foreground",
				className ?? "size-3.5"
			)}
		>
			{ORG.name[0]}
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
