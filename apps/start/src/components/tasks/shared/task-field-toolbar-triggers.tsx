import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
	IconCategory,
	IconGitBranch,
	IconLabel,
	IconLock,
	IconLockOpen2,
	IconRocket,
	IconUserPlus,
	IconX,
} from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import type { FieldConfig } from "./task-field-toolbar-types";
import type { statusConfig, priorityConfig } from "./config";
import { TaskPickerItem } from "./task-picker";

// ────────────────────────────────────────────────────────────────────────────
// Creator-variant custom triggers
//
// Each function returns the JSX used as `customTrigger` for a field in the
// "creator" toolbar variant.  They accept a `FieldConfig` so that per-field
// `iconOnly` / `className` overrides are respected.
// ────────────────────────────────────────────────────────────────────────────

type StatusConfigEntry = (typeof statusConfig)[keyof typeof statusConfig];
type PriorityConfigEntry = (typeof priorityConfig)[keyof typeof priorityConfig];

interface StatusTriggerData {
	statusCfg: StatusConfigEntry | undefined;
}

export function creatorStatusTrigger(cfg: FieldConfig, data: StatusTriggerData) {
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7", cfg.className)}
			size={"sm"}
		>
			{data.statusCfg?.icon(`h-3.5 w-3.5 ${data.statusCfg?.className || ""}`)}
			{!cfg.iconOnly && (data.statusCfg?.label || "Status")}
		</Button>
	);
}

interface PriorityTriggerData {
	priorityCfg: PriorityConfigEntry | undefined;
}

export function creatorPriorityTrigger(cfg: FieldConfig, data: PriorityTriggerData) {
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7", cfg.className)}
			size={"sm"}
		>
			{data.priorityCfg?.icon(`h-3.5 w-3.5 ${data.priorityCfg?.className || ""}`)}
			{!cfg.iconOnly && (data.priorityCfg?.label || "Priority")}
		</Button>
	);
}

export function creatorLabelsTrigger(cfg: FieldConfig, selectedLabels: schema.TaskWithLabels["labels"]) {
	const labels = selectedLabels ?? [];
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7 line-clamp-1", cfg.className)}
			size={"sm"}
		>
			{labels.length > 1 ? (
				<div className="flex items-center gap-2">
					<div className="flex -space-x-1">
						{labels.map((label) => (
							<span
								key={label.id}
								className="h-2 w-2 shrink-0 rounded-full"
								style={{ backgroundColor: label.color || "#cccccc" }}
							/>
						))}
					</div>
					{!cfg.iconOnly && <span>{labels.length} labels</span>}
				</div>
			) : labels.length === 1 ? (
				<div className="flex items-center">
					<span
						className={cn(
							"h-2 w-2 shrink-0 rounded-full",
							!cfg.iconOnly && "mr-2",
						)}
						style={{ backgroundColor: labels[0]?.color || "#cccccc" }}
					/>
					{!cfg.iconOnly && <span>{labels[0]?.name}</span>}
				</div>
			) : (
				<span className="flex items-center gap-2">
					<IconLabel className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
					{!cfg.iconOnly && "Labels"}
				</span>
			)}
		</Button>
	);
}

export function creatorAssigneesTrigger(cfg: FieldConfig, selectedAssignees: schema.TaskWithLabels["assignees"]) {
	const assignees = selectedAssignees ?? [];
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7 line-clamp-1", cfg.className)}
			size={"sm"}
		>
			{assignees.length > 1 ? (
				<div className="flex items-center gap-2">
					<div className="flex -space-x-1">
						{assignees.map((assignee) => (
							<Avatar
								key={assignee.id}
								className="h-4 w-4 border border-background"
							>
								<AvatarImage
									src={assignee.image || undefined}
									alt={assignee.name}
								/>
								<AvatarFallback className="text-[8px]">
									{assignee.name
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()
										.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
						))}
					</div>
					{!cfg.iconOnly && <span>{assignees.length} assignees</span>}
				</div>
			) : assignees.length === 1 ? (
				<div className="flex items-center">
					<Avatar className={cn("h-4 w-4", !cfg.iconOnly && "mr-2")}>
						<AvatarImage
							src={assignees[0]?.image || undefined}
							alt={assignees[0]?.name}
						/>
						<AvatarFallback className="text-[8px]">
							{assignees[0]?.name
								.split(" ")
								.map((n) => n[0])
								.join("")
								.toUpperCase()
								.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					{!cfg.iconOnly && <span>{assignees[0]?.name}</span>}
				</div>
			) : (
				<span className="flex items-center gap-2">
					<IconUserPlus
						className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
					/>
					{!cfg.iconOnly && "Assignees"}
				</span>
			)}
		</Button>
	);
}

export function creatorCategoryTrigger(cfg: FieldConfig, selectedCategory: schema.categoryType | undefined) {
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7", cfg.className)}
			size={"sm"}
		>
			{selectedCategory ? (
				<>
					<RenderIcon
						iconName={selectedCategory.icon || "IconCircleFilled"}
						className={cn(
							"size-3.5! [&_svg]:size-3.5!",
							!cfg.iconOnly && "mr-1",
						)}
						color={selectedCategory.color || undefined}
						button
					/>
					{!cfg.iconOnly && selectedCategory.name}
				</>
			) : (
				<>
					<IconCategory
						className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
					/>
					{!cfg.iconOnly && "Category"}
				</>
			)}
		</Button>
	);
}

interface VisibilityTriggerCallbacks {
	onToggle: () => void;
}

export function creatorVisibilityTrigger(
	cfg: FieldConfig,
	visible: string | null | undefined,
	callbacks: VisibilityTriggerCallbacks,
) {
	return (
		<Button
			variant={"primary"}
			className={cn(
				"w-fit text-xs h-7",
				visible === "private" && "border-primary/50",
				cfg.className,
			)}
			size={"sm"}
			onClick={callbacks.onToggle}
		>
			{visible === "private" ? (
				<>
					<IconLock className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
					{!cfg.iconOnly && "Private"}
				</>
			) : (
				<>
					<IconLockOpen2
						className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
					/>
					{!cfg.iconOnly && "Public"}
				</>
			)}
		</Button>
	);
}

export function creatorReleaseTrigger(cfg: FieldConfig, selectedRelease: schema.releaseType | undefined) {
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7", cfg.className)}
			size={"sm"}
		>
			{selectedRelease ? (
				<>
					{selectedRelease.icon ? (
						<RenderIcon
							iconName={selectedRelease.icon}
							className={cn(
								"size-3.5! [&_svg]:size-3.5!",
								!cfg.iconOnly && "mr-1",
							)}
							color={selectedRelease.color || undefined}
							button
						/>
					) : (
						<IconRocket
							className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
						/>
					)}
					{!cfg.iconOnly && selectedRelease.name}
				</>
			) : (
				<>
					<IconRocket className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
					{!cfg.iconOnly && "Release"}
				</>
			)}
		</Button>
	);
}

interface ParentTriggerCallbacks {
	onClear: () => void;
}

export function creatorParentTrigger(
	cfg: FieldConfig,
	selectedParentTask: OrgTaskSearchResult | null | undefined,
	callbacks: ParentTriggerCallbacks,
) {
	if (selectedParentTask) {
		return (
			<div className="inline-flex items-center gap-1 rounded-lg p-1 text-xs font-medium border border-transparent hover:border-border bg-transparent hover:bg-secondary transition-colors h-7">
				<TaskPickerItem task={selectedParentTask} />
				<button
					type="button"
					className="inline-flex items-center justify-center h-4 w-4 rounded shrink-0 text-muted-foreground hover:text-foreground transition-colors"
					onClick={(e) => {
						e.stopPropagation();
						callbacks.onClear();
					}}
				>
					<IconX className="h-3 w-3" />
				</button>
			</div>
		);
	}
	return (
		<Button
			variant={"primary"}
			className={cn("w-fit text-xs h-7", cfg.className)}
			size={"sm"}
		>
			<IconGitBranch
				className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
			/>
			{!cfg.iconOnly && "Subtask of..."}
		</Button>
	);
}
