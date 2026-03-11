import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import {
	IconArrowUpRight,
	IconArrowDownRight,
	IconLink,
	IconLinkOff,
	IconCopy,
	IconForbidFilled,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { statusConfig } from "../../shared/config";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";
import type { schema } from "@repo/database";

/* -------------------------------------------------------------------------- */
/*                               Shared helpers                               */
/* -------------------------------------------------------------------------- */

function taskStatusIcon(task: schema.TaskWithLabels, FallbackIcon: React.ComponentType<{ size?: number; className?: string }>) {
	const statusKey = task.status?.replace(/"/g, "") as keyof typeof statusConfig | undefined;
	const cfg = statusKey ? statusConfig[statusKey] : undefined;
	return cfg ? cfg.icon(cn(cfg.className, "h-3.5 w-3.5")) : <FallbackIcon size={12} />;
}

function TaskLink({
	task,
	FallbackIcon,
}: {
	task: schema.TaskWithLabels;
	FallbackIcon: React.ComponentType<{ size?: number; className?: string }>;
}) {
	return (
		<Link
			to="/$orgId/tasks/$taskShortId"
			params={{
				orgId: task.organizationId,
				taskShortId: String(task.shortId),
			}}
			className="inline"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={`#${task.shortId} ${task.title}`}
				icon={taskStatusIcon(task, FallbackIcon)}
			/>
		</Link>
	);
}

/* -------------------------------------------------------------------------- */
/*                           Parent Added / Removed                           */
/* -------------------------------------------------------------------------- */

export function TimelineParentAdded({
	item,
	tasks = [],
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	const parentId = typeof item.toValue === "string" ? item.toValue.replaceAll('"', "") : null;
	const parentTask = parentId ? tasks.find((t) => t.id === parentId) : null;

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconArrowUpRight}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			set parent to{" "}
			{parentTask ? (
				<TaskLink task={parentTask} FallbackIcon={IconArrowUpRight} />
			) : (
				<InlineLabel
					className="text-muted-foreground"
					text="a task"
					icon={<IconArrowUpRight size={12} />}
				/>
			)}
		</TimelineItemWrapper>
	);
}

export function TimelineParentRemoved({
	item,
	tasks = [],
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	const parentId = typeof item.fromValue === "string" ? item.fromValue.replaceAll('"', "") : null;
	const parentTask = parentId ? tasks.find((t) => t.id === parentId) : null;

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconArrowUpRight}
			color="bg-accent text-muted-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			removed parent{" "}
			{parentTask ? (
				<TaskLink task={parentTask} FallbackIcon={IconArrowUpRight} />
			) : (
				<InlineLabel
					className="text-muted-foreground"
					text="a task"
					icon={<IconArrowUpRight size={12} />}
				/>
			)}
		</TimelineItemWrapper>
	);
}

/* -------------------------------------------------------------------------- */
/*                          Subtask Added / Removed                           */
/* -------------------------------------------------------------------------- */

export function TimelineSubtaskAdded({
	item,
	tasks = [],
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	const subtaskId = typeof item.toValue === "string" ? item.toValue.replaceAll('"', "") : null;
	const subtask = subtaskId ? tasks.find((t) => t.id === subtaskId) : null;

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconArrowDownRight}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			added subtask{" "}
			{subtask ? (
				<TaskLink task={subtask} FallbackIcon={IconArrowDownRight} />
			) : (
				<InlineLabel
					className="text-muted-foreground"
					text="a task"
					icon={<IconArrowDownRight size={12} />}
				/>
			)}
		</TimelineItemWrapper>
	);
}

export function TimelineSubtaskRemoved({
	item,
	tasks = [],
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	const subtaskId = typeof item.fromValue === "string" ? item.fromValue.replaceAll('"', "") : null;
	const subtask = subtaskId ? tasks.find((t) => t.id === subtaskId) : null;

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconArrowDownRight}
			color="bg-accent text-muted-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			removed subtask{" "}
			{subtask ? (
				<TaskLink task={subtask} FallbackIcon={IconArrowDownRight} />
			) : (
				<InlineLabel
					className="text-muted-foreground"
					text="a task"
					icon={<IconArrowDownRight size={12} />}
				/>
			)}
		</TimelineItemWrapper>
	);
}

/* -------------------------------------------------------------------------- */
/*                         Relation Added / Removed                           */
/* -------------------------------------------------------------------------- */

const RELATION_TYPE_CONFIG: Record<
	string,
	{ label: string; icon: React.ComponentType<{ size?: number; className?: string }>; className?: string }
> = {
	blocking: { label: "blocking", icon: IconForbidFilled, className: "text-destructive/80" },
	related: { label: "related to", icon: IconLink, className: "text-muted-foreground" },
	duplicate: { label: "duplicate of", icon: IconCopy, className: "text-muted-foreground" },
};

function parseRelationValue(value: unknown): { type?: string; relatedTaskId?: string } | null {
	if (!value) return null;
	if (typeof value === "object") return value as { type?: string; relatedTaskId?: string };
	if (typeof value === "string") {
		try {
			return JSON.parse(value.replaceAll('"', '"'));
		} catch {
			return null;
		}
	}
	return null;
}

export function TimelineRelationAdded({
	item,
	tasks = [],
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	const info = parseRelationValue(item.toValue);
	const relationType = info?.type || "related";
	const relatedTaskId = info?.relatedTaskId;
	const relatedTask = relatedTaskId ? tasks.find((t) => t.id === relatedTaskId) : null;
	const config = RELATION_TYPE_CONFIG[relationType] ?? RELATION_TYPE_CONFIG.related!;

	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconLink}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			added {config.label} relation{" "}
			{relatedTask ? (
				<TaskLink task={relatedTask} FallbackIcon={config.icon} />
			) : (
				<InlineLabel
					className="text-muted-foreground"
					text="a task"
					icon={<config.icon size={12} className={config.className} />}
				/>
			)}
		</TimelineItemWrapper>
	);
}

export function TimelineRelationRemoved({
	item,
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconLinkOff}
			color="bg-accent text-muted-foreground"
		>
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={item.actor ? getDisplayName(item.actor) : "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			removed a relation
		</TimelineItemWrapper>
	);
}
