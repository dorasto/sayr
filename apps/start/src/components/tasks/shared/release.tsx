"use client";

import type { schema } from "@repo/database";
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
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import RenderIcon from "@/components/generic/RenderIcon";

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
			const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...task, releaseId: releaseId || null } : t));
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
						wsClientId
					)
			);

			// If server update succeeded, update the task
			if (data?.success && data.data && setTasks) {
				const updatedTasks = tasks.map((t) => (t.id === data.data.id ? data.data : t));
				setTasks(updatedTasks);
				if (task) {
					setSelectedTask(data.data);
					sendWindowMessage(
						window,
						{
							type: "timeline-update",
							payload: data.data.id,
						},
						"*"
					);
				}
			}
		}
	};

	const selectedRelease = releases.find((r) => r.id === task.releaseId);

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && showLabel && <Label variant={"subheading"}>Release</Label>}

			<div className="flex flex-col gap-2">
				<ComboBox
					value={selectedRelease?.id || ""}
					onValueChange={handleReleaseChange}
					open={open}
					onOpenChange={setOpen}
				>
					{customTrigger ? (
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className={className}>
							<ComboBoxValue placeholder="Select release">
								{selectedRelease ? (
									<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
										{selectedRelease.icon ? (
											<RenderIcon
												iconName={selectedRelease.icon}
												size={12}
												color={selectedRelease.color || undefined}
												raw
											/>
										) : (
											<div
												className="h-3 w-3 rounded-full"
												style={{
													backgroundColor: selectedRelease.color || "#cccccc",
												}}
											/>
										)}
										<span className="truncate">{selectedRelease.name}</span>
									</div>
								) : (
									<div className="flex items-center gap-2 text-muted-foreground">
										<IconRocket className="h-4 w-4" />
										{!compact && <span className="truncate">No release</span>}
									</div>
								)}
							</ComboBoxValue>
							{showChevron && <ComboBoxIcon />}
						</ComboBoxTrigger>
					)}

					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Search releases..." />
						<ComboBoxList>
							<ComboBoxEmpty className="px-3 pt-3 flex flex-col items-center w-full">
								<div className="flex flex-col gap-1">
									<Label>No releases found</Label>
									<Link to="/settings/org/$orgId/releases" params={{ orgId: task.organizationId }}>
										<Button variant="primary" size={"sm"} className="">
											Create new
										</Button>
									</Link>
								</div>
							</ComboBoxEmpty>
							<ComboBoxGroup>
								{releases.map((release) => (
									<ComboBoxItem key={release.id} value={release.id} searchValue={release.name.toLowerCase()}>
										<div className="flex items-center gap-2">
											{release.icon ? (
												<RenderIcon
													iconName={release.icon}
													size={12}
													color={release.color || undefined}
													raw
												/>
											) : (
												<div
													className="h-3 w-3 rounded-full"
													style={{
														backgroundColor: release.color || "#cccccc",
													}}
												/>
											)}
											<span>{release.name}</span>
										</div>
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			</div>
		</div>
	);
}
