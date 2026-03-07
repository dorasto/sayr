"use client";

import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconCircleFilled, IconUserOff } from "@tabler/icons-react";
import { RenderLabel } from "../shared/label";
import { RenderCategory, RenderRelease } from "../shared";

// ---------------------------------------------------------------------------
// Assignee avatar trigger (used inside GlobalTaskAssignees customTrigger)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Assignee avatar trigger (used inside GlobalTaskAssignees customTrigger)
// ---------------------------------------------------------------------------

interface AssigneeAvatarTriggerProps {
	assignees: schema.UserSummary[];
	/** Max stacked avatars to show before "+N" (default 3) */
	maxVisible?: number;
	/** Extra class on the single avatar */
	avatarClassName?: string;
	/** Simplified mode for kanban — no fallback initials styling differences */
	simple?: boolean;
}

export function AssigneeAvatarTrigger({
	assignees,
	maxVisible = 3,
	avatarClassName,
	simple = false,
}: AssigneeAvatarTriggerProps) {
	if (!assignees || assignees.length === 0) {
		return (
			<div
				className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5 cursor-pointer"
				data-no-propagate
			>
				<IconUserOff className="h-3 w-3 shrink-0" />
			</div>
		);
	}

	if (assignees.length === 1 && !simple) {
		return (
			<div className="flex items-center cursor-pointer" data-no-propagate>
				<Avatar className={cn("rounded-full h-5 w-5", avatarClassName)}>
					<AvatarImage
						src={assignees[0]?.image || "/avatar.jpg"}
						alt={assignees[0]?.name}
					/>
					<AvatarFallback className="rounded-full bg-accent uppercase text-xs">
						{assignees[0]?.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
			</div>
		);
	}

	return (
		<div
			className={cn("flex -space-x-2", !simple && "cursor-pointer")}
			data-no-propagate
		>
			{assignees.slice(0, maxVisible).map((assignee, index) => (
				<Avatar
					key={assignee.id}
					className={cn(
						"rounded-full h-5 w-5",
						!simple && index > 0 && "relative",
					)}
					style={!simple ? { zIndex: assignees.length - index } : undefined}
				>
					<AvatarImage
						src={assignee?.image || (simple ? undefined : "/avatar.jpg")}
						alt={assignee?.name}
					/>
					<AvatarFallback
						className={cn(
							simple
								? "text-[8px]"
								: "rounded-full bg-accent uppercase text-xs",
						)}
					>
						{simple
							? assignee.name?.slice(0, 2).toUpperCase()
							: assignee?.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
			))}
			{assignees.length > maxVisible &&
				(simple ? (
					<div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium">
						+{assignees.length - maxVisible}
					</div>
				) : (
					<div className="flex items-center justify-center rounded-full h-5 w-5 bg-muted border-2 border-background text-xs font-medium text-muted-foreground relative">
						+{assignees.length - maxVisible}
					</div>
				))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Category badge button
// ---------------------------------------------------------------------------

interface CategoryBadgeButtonProps {
	categoryId: string | null;
	categories: schema.categoryType[];
	onClick: (categoryId: string) => void;
}

export function CategoryBadgeButton({
	categoryId,
	categories,
	onClick,
}: CategoryBadgeButtonProps) {
	if (!categoryId) return null;
	const category = categories.find((c) => c.id === categoryId);
	if (!category) return null;

	return (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick(category.id);
			}}
			data-no-propagate
			className="cursor-pointer"
		>
			<RenderCategory category={category} />
		</button>
	);
}

// ---------------------------------------------------------------------------
// Release badge button
// ---------------------------------------------------------------------------

interface ReleaseBadgeButtonProps {
	releaseId: string | null;
	releases: schema.releaseType[];
	onClick: (releaseId: string) => void;
}

export function ReleaseBadgeButton({
	releaseId,
	releases,
	onClick,
}: ReleaseBadgeButtonProps) {
	if (!releaseId) return null;
	const release = releases.find((r) => r.id === releaseId);
	if (!release) return null;

	return (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick(release.id);
			}}
			data-no-propagate
			className="cursor-pointer"
		>
			<RenderRelease release={release} />
		</button>
	);
}

// ---------------------------------------------------------------------------
// Inline label list
// ---------------------------------------------------------------------------

type LabelOverflowStyle = "count" | "dots";

interface TaskLabelsInlineProps {
	labels: schema.labelType[];
	/** Max labels to show before overflow (default 2) */
	maxVisible?: number;
	/** Container class name */
	className?: string;
	/** Per-label class name */
	labelClassName?: string;
	/** How to render the overflow: "count" = "+N", "dots" = coloured dots + "+N" */
	overflowStyle?: LabelOverflowStyle;
}

export function TaskLabelsInline({
	labels,
	maxVisible = 2,
	className,
	labelClassName,
	overflowStyle = "count",
}: TaskLabelsInlineProps) {
	if (!labels || labels.length === 0) return null;

	return (
		<div className={className}>
			{labels.slice(0, maxVisible).map((label) => (
				<RenderLabel
					key={label.id}
					label={label}
					data-no-propagate
					className={labelClassName}
				/>
			))}
			{labels.length > maxVisible && (
				<Badge
					variant="secondary"
					className={cn(
						"flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative shrink-0",
						overflowStyle === "dots" && "bg-accent",
						overflowStyle === "count" && labels.length <= maxVisible + 5 && "px-1",
					)}
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					{overflowStyle === "dots" && (
						<div className="flex -space-x-1.5">
							{labels.slice(maxVisible).map((label) => (
								<IconCircleFilled
									key={label.id}
									className="h-3 w-3"
									style={{
										color: label.color || "var(--foreground)",
									}}
								/>
							))}
						</div>
					)}
					+{labels.length - maxVisible}
				</Badge>
			)}
		</div>
	);
}
