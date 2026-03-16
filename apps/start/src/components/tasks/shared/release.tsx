"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import RenderIcon from "@/components/generic/RenderIcon";
import { getReleaseOptions, getReleaseDisplay, getReleaseUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";
import { InlineLabel } from "./inlinelabel";

interface GlobalTaskReleaseProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (releaseId: string) => void;
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	releases: schema.releaseType[];
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
	/** Compact mode shows only the icon without text label */
	compact?: boolean;
}

export default function GlobalTaskRelease({
	task,
	editable = false,
	onChange,
	tasks = [],
	setTasks,
	setSelectedTask,
	open,
	setOpen,
	customTrigger,
	releases,
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskReleaseProps) {
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => { }),
		setTasks ?? (() => { }),
		sseClientId,
	);

	const handleReleaseChange = (releaseId: string | null) => {
		onChange?.(releaseId || "");
		execute(getReleaseUpdatePayload(task, releaseId || null, releases));
	};

	// Get options from the action system (skip the "none" option for ComboBox)
	const options = getReleaseOptions(releases).filter((opt) => opt.id !== "none");
	const display = getReleaseDisplay(task, releases);

	// The trigger needs richer display (slug, compact mode) that goes beyond getDisplay
	const selectedRelease = releases.find((r) => r.id === task.releaseId);

	const renderTriggerContent = () => {
		if (selectedRelease) {
			return (
				<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
					{display.icon}
					{compact ? (
						<span className="truncate font-mono">{selectedRelease.slug}</span>
					) : (
						<span className="truncate">
							{selectedRelease.name}
							<span className="truncate font-mono">({selectedRelease.slug})</span>
						</span>
					)}
				</div>
			);
		}
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<IconRocket className="h-4 w-4" />
				{!compact && <span className="truncate">No release</span>}
			</div>
		);
	};

	const renderDropdown = () => (
		<ComboBoxContent>
			<ComboBoxSearch icon placeholder="Search releases..." />
			<ComboBoxList>
				<ComboBoxEmpty className="px-3 pt-3 flex flex-col items-center w-full">
					<div className="flex flex-col gap-1">
						<Label>No releases found</Label>
						<Link
							to="/settings/org/$orgId/releases"
							params={{ orgId: task.organizationId }}
						>
							<Button variant="primary" size={"sm"}>
								Create new
							</Button>
						</Link>
					</div>
				</ComboBoxEmpty>
				<ComboBoxGroup>
					{options.map((opt) => (
						<ComboBoxItem key={opt.id} value={opt.id} searchValue={opt.label.toLowerCase()}>
							<div className="flex items-center gap-2">
								{opt.icon}
								<span>{opt.label}</span>
							</div>
						</ComboBoxItem>
					))}
				</ComboBoxGroup>
			</ComboBoxList>
		</ComboBoxContent>
	);

	return customTrigger ? (
		<ComboBox
			value={selectedRelease?.id || ""}
			onValueChange={handleReleaseChange}
			open={open}
			onOpenChange={setOpen}
		>
			<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			{renderDropdown()}
		</ComboBox>
	) : (
		<div className="flex flex-col gap-3">
			{showLabel && <Label variant={"subheading"}>Release</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox
					value={selectedRelease?.id || ""}
					onValueChange={handleReleaseChange}
					open={open}
					onOpenChange={setOpen}
				>
					<ComboBoxTrigger disabled={!editable} className={className}>
						<ComboBoxValue placeholder="Select release">
							{renderTriggerContent()}
						</ComboBoxValue>
						{showChevron && <ComboBoxIcon />}
					</ComboBoxTrigger>
					{renderDropdown()}
				</ComboBox>
			</div>
		</div>
	);
}

interface RenderReleaseProps {
	release: {
		id: string;
		name: string;
		color?: string | null;
		icon?: string | null;
		slug?: string | null;
	};
	onClick?: (e: React.MouseEvent, releaseId: string) => void;
	className?: string;
}

export function RenderRelease({
	release,
	onClick,
	className = "",
}: RenderReleaseProps) {
	return (
		<Badge
			data-no-propagate
			key={release.id}
			variant="secondary"
			className={cn(
				"flex items-center justify-center gap-1 bg-accent ps-0 text-xs h-5 border border-border rounded-2xl truncate group/release cursor-pointer w-fit relative",
				className,
			)}
			onClick={onClick ? (e) => onClick(e, release.id) : undefined}
		>
			<InlineLabel
				text={release.slug}
				icon={
					release.icon ? (
						<RenderIcon
							iconName={release.icon}
							size={12}
							color={release.color || undefined}
							raw
						/>
					) : (
						<div
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: release.color || "#cccccc" }}
						/>
					)
				}
				className=""
			/>
		</Badge>
	);
}
