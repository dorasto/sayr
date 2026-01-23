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
import { XIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";

interface GlobalTaskReleaseProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (releaseId: string) => void;

	// Optional internal logic for linked state management with task list
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;

	useInternalLogic?: boolean;
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
	useInternalLogic = false,
	open,
	setOpen,
	customTrigger,
	releases,
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskReleaseProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast } = useToastAction();

	const handleReleaseChange = async (releaseId: string | null) => {
		// Always call onChange first
		if (onChange) {
			onChange(releaseId || "");
		}

		if (useInternalLogic && tasks && setTasks && setSelectedTask) {
			// Optimistic UI update
			const updatedTasks = tasks.map((t) =>
				t.id === task.id ? { ...task, releaseId: releaseId || null } : t,
			);
			setTasks(updatedTasks);
			if (task) {
				setSelectedTask({ ...task, releaseId: releaseId || null });
			}

			// Server update
			const data = await runWithToast(
				"update-task-release",
				{
					loading: {
						title: "Updating task...",
						description: "Updating your task release...",
					},
					success: {
						title: "Updated task",
						description: "Your task release has been updated successfully.",
					},
					error: {
						title: "Failed to update task",
						description: "An error occurred while updating your task release.",
					},
				},
				() =>
					updateTaskAction(
						task.organizationId,
						task.id,
						{
							releaseId: releaseId || null,
						},
						wsClientId,
					),
			);

			// If server update succeeded, update the task
			if (data?.success && data.data && setTasks) {
				const updatedTasks = tasks.map((t) => (t.id === data.data.id ? data.data : t));
				setTasks(updatedTasks);
				if (task) {
					setSelectedTask(data.data);
				}
			}
		}
	};

	const selectedRelease = releases.find((r) => r.id === task.releaseId);

	if (!editable && !selectedRelease) {
		return null;
	}

	if (customTrigger) {
		return (
			<ComboBox value={task.releaseId || ""} onValueChange={handleReleaseChange} open={open} onOpenChange={setOpen}>
				<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
				<ComboBoxContent>
					<ComboBoxSearch placeholder="Search releases..." />
					<ComboBoxList>
						<ComboBoxEmpty>
							<Label>
								No releases found. Create a new release{" "}
								<Link
									to="/settings/org/$orgId/releases"
									params={{ orgId: task.organizationId }}
									className="text-primary"
								>
									here
								</Link>
							</Label>
						</ComboBoxEmpty>
					<ComboBoxGroup>
						<ComboBoxItem value="">
							<div className="flex items-center gap-2">
								<XIcon className="size-4" />
								<span>No release</span>
							</div>
						</ComboBoxItem>
						{releases.map((release) => (
							<ComboBoxItem key={release.id} value={release.id}>
								<div className="flex items-center gap-2 w-full">
									{release.icon ? (
										<span className="text-base">{release.icon}</span>
									) : (
										<IconRocket className="size-4" />
									)}
									<span className="flex-1">{release.name}</span>
									<Badge
										variant="outline"
										className="text-xs"
										style={{
											backgroundColor: release.color || "transparent",
										}}
									>
										{release.slug}
									</Badge>
								</div>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
					</ComboBoxList>
				</ComboBoxContent>
			</ComboBox>
		);
	}

	return (
		<ComboBox value={task.releaseId || ""} onValueChange={handleReleaseChange}>
			<ComboBoxTrigger
				asChild={compact}
				className={cn(!compact && "h-6 border border-transparent hover:border-border", className)}
			>
				{compact ? (
					<Button variant="accent" size="icon" className="size-5 shrink-0">
						{selectedRelease?.icon ? (
							<span className="text-sm">{selectedRelease.icon}</span>
						) : (
							<IconRocket className="size-3.5" />
						)}
					</Button>
				) : (
					<Button
						variant="accent"
						className={cn("h-6 w-fit px-1.5 gap-1.5 text-xs rounded-md", className)}
					>
						{selectedRelease ? (
							<>
								{selectedRelease.icon ? (
									<span className="text-sm">{selectedRelease.icon}</span>
								) : (
									<IconRocket className="size-3.5" />
								)}
								{showLabel && <ComboBoxValue>{selectedRelease.name}</ComboBoxValue>}
								{showChevron && <ComboBoxIcon />}
							</>
						) : (
							<>
								<IconRocket className="size-3.5" />
								{showLabel && <ComboBoxValue>No release</ComboBoxValue>}
								{showChevron && <ComboBoxIcon />}
							</>
						)}
					</Button>
				)}
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search releases..." />
				<ComboBoxList>
					<ComboBoxEmpty>
						<Label>
							No releases found. Create a new release{" "}
							<Link
								to="/settings/org/$orgId/releases"
								params={{ orgId: task.organizationId }}
								className="text-primary"
							>
								here
							</Link>
						</Label>
					</ComboBoxEmpty>
					<ComboBoxGroup>
						<ComboBoxItem value="">
							<div className="flex items-center gap-2">
								<XIcon className="size-4" />
								<span>No release</span>
							</div>
						</ComboBoxItem>
						{releases.map((release) => (
							<ComboBoxItem key={release.id} value={release.id}>
								<div className="flex items-center gap-2 w-full">
									{release.icon ? (
										<span className="text-base">{release.icon}</span>
									) : (
										<IconRocket className="size-4" />
									)}
									<span className="flex-1">{release.name}</span>
									<Badge
										variant="outline"
										className="text-xs"
										style={{
											backgroundColor: release.color || "transparent",
										}}
									>
										{release.slug}
									</Badge>
								</div>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
