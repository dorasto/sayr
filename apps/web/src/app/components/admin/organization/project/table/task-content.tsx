"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { JsonViewer } from "@repo/ui/components/tomui/json-viewer";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowsHorizontal, IconCode, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import GlobalTaskAssignees from "@/app/components/globals/tasks/assignee";
import GlobalTaskCreatedAt from "@/app/components/globals/tasks/created";
import GlobalTaskLabels from "@/app/components/globals/tasks/label";
import GlobalTaskPriority from "@/app/components/globals/tasks/priority";
import GlobalTaskStatus from "@/app/components/globals/tasks/status";
import GlobalTimeline from "@/app/components/globals/tasks/timeline";
import { updateLabelToTaskAction, updateTaskAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";
import { statusConfig } from "./task-list-item";

interface TaskContentProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	availableUsers?: schema.userType[];
}
export function TaskContent({
	open,
	onOpenChange,
	task,
	labels,
	tasks,
	setTasks,
	setSelectedTask,
	availableUsers = [],
}: TaskContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const { runWithToast } = useToastAction();
	const [openData, onOpenDataChange] = useState(false);
	return (
		<SplitDialog
			isOpen={open}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center w-full gap-4">
					<Label variant={"heading"} className={cn("text-left text-lg truncate")}>
						{task.title}
					</Label>
					<Label variant={"heading"} className={cn("text-left text-lg text-muted-foreground shrink-0")}>
						#{task.shortId}
					</Label>
					<div className="ml-auto flex items-center gap-2 shrink-0">
						<Badge
							variant={"outline"}
							className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
						>
							{status?.icon(`${status?.className || ""}`)}
							{status.label}
						</Badge>
						<Link href={`/admin/${task.organizationId}/${task.projectId}/task/${task.shortId}`}>
							<Button size={"icon"} className="size-5" variant={"ghost"} onClick={() => onOpenChange(false)}>
								<IconArrowsHorizontal className="rotate-45" />
							</Button>
						</Link>
						<Button
							size={"icon"}
							className="size-5"
							variant={openData ? "accent" : "ghost"}
							onClick={() => onOpenDataChange(!openData)}
						>
							<IconCode />
						</Button>
						<Button size={"icon"} className="size-5" variant={"ghost"} onClick={() => onOpenChange(false)}>
							<IconX />
						</Button>
					</div>
				</div>
			}
			sidebarPosition="right"
		>
			<SplitDialogContent>
				<JsonViewer data={task} name="task" open={openData} onOpenChange={onOpenDataChange} />

				<GlobalTimeline task={task} labels={labels} />
			</SplitDialogContent>
			<SplitDialogSide className="p-2">
				<div className="flex flex-col gap-3">
					{/* <GlobalTaskCreatedAt task={task} />
					<Separator /> */}

					<GlobalTaskStatus
						task={task}
						editable={true}
						onChange={async (value) => {
							tasks = tasks.map((t) =>
								t.id === task.id ? { ...task, status: value as schema.TaskWithLabels["status"] } : t
							);
							setTasks(tasks);
							if (task) {
								setSelectedTask({ ...task, status: value as schema.TaskWithLabels["status"] });
							}
							const data = await runWithToast(
								"update-task-status",
								{
									loading: {
										title: "Updating task...",
										description: "Updating your task... changes are already visible.",
									},
									success: {
										title: "Task saved",
										description: "Your changes have been saved successfully.",
									},
									error: {
										title: "Save failed",
										description:
											"Your changes are showing, but we couldn’t save them to the server. Please try again.",
									},
								},
								() =>
									updateTaskAction(task.organizationId, task.projectId, task.id, { status: value }, wsClientId)
							);
							if (data?.success && data.data) {
								tasks = tasks.map((t) => (t.id === task.id ? data.data : t));
								setTasks(tasks);
								if (task && task.id === data.data.id) {
									setSelectedTask(data.data);
								}
							}
						}}
					/>
					<GlobalTaskAssignees
						task={task}
						editable={true}
						availableUsers={availableUsers}
						onAssigneesChange={async (values) => {
							// Update local state optimistically - preserve existing assignees that match the selected IDs
							const updatedAssignees = task.assignees.filter((assignee) => values.includes(assignee.id));
							// For now, we can only work with existing assignees since we don't have full user objects
							// In a real implementation, you'd fetch the full user objects or have them available

							tasks = tasks.map((t) => (t.id === task.id ? { ...task, assignees: updatedAssignees } : t));
							setTasks(tasks);
							if (task) {
								setSelectedTask({
									...task,
									assignees: updatedAssignees,
								});
							}
							// TODO: Add API call to update assignees when backend is ready
							// const data = await runWithToast(
							// 	"update-task-assignees",
							// 	{
							// 		loading: {
							// 			title: "Updating task...",
							// 			description: "Updating your task... changes are already visible.",
							// 		},
							// 		success: {
							// 			title: "Task saved",
							// 			description: "Your changes have been saved successfully.",
							// 		},
							// 		error: {
							// 			title: "Save failed",
							// 			description:
							// 				"Your changes are showing, but we couldn't save them to the server. Please try again.",
							// 		},
							// 	},
							// 	() => updateTaskAssigneesAction(task.organizationId, task.projectId, task.id, values, wsClientId)
							// );
							// if (data?.success && data.data) {
							// 	tasks = tasks.map((t) => (t.id === task.id ? data.data : t));
							// 	setTasks(tasks);
							// 	if (task && task.id === data.data.id) {
							// 		setSelectedTask(data.data);
							// 	}
							// }
						}}
					/>
					<GlobalTaskLabels
						task={task}
						editable={true}
						availableLabels={labels}
						onLabelsChange={async (values) => {
							tasks = tasks.map((t) =>
								t.id === task.id ? { ...task, labels: labels.filter((label) => values.includes(label.id)) } : t
							);
							setTasks(tasks);
							if (task) {
								setSelectedTask({
									...task,
									labels: labels.filter((label) => values.includes(label.id)),
								});
							}
							const data = await runWithToast(
								"update-task-labels",
								{
									loading: {
										title: "Updating task...",
										description: "Updating your task... changes are already visible.",
									},
									success: {
										title: "Task saved",
										description: "Your changes have been saved successfully.",
									},
									error: {
										title: "Save failed",
										description:
											"Your changes are showing, but we couldn’t save them to the server. Please try again.",
									},
								},
								() => updateLabelToTaskAction(task.organizationId, task.projectId, task.id, values, wsClientId)
							);
							if (data?.success && data.data) {
								tasks = tasks.map((t) => (t.id === task.id ? data.data : t));
								setTasks(tasks);
								if (task && task.id === data.data.id) {
									setSelectedTask(data.data);
								}
							}
						}}
					/>
					<GlobalTaskPriority
						task={task}
						editable={true}
						onPriorityChange={async (value) => {
							tasks = tasks.map((t) =>
								t.id === task.id ? { ...task, priority: value as schema.TaskWithLabels["priority"] } : t
							);
							setTasks(tasks);
							if (task) {
								setSelectedTask({ ...task, priority: value as schema.TaskWithLabels["priority"] });
							}
							const data = await runWithToast(
								"update-task-priority",
								{
									loading: {
										title: "Updating task...",
										description: "Updating your task... changes are already visible.",
									},
									success: {
										title: "Task saved",
										description: "Your changes have been saved successfully.",
									},
									error: {
										title: "Save failed",
										description:
											"Your changes are showing, but we couldn’t save them to the server. Please try again.",
									},
								},
								() =>
									updateTaskAction(
										task.organizationId,
										task.projectId,
										task.id,
										{
											priority: value,
										},
										wsClientId
									)
							);
							if (data?.success && data.data) {
								tasks = tasks.map((t) => (t.id === task.id ? data.data : t));
								setTasks(tasks);
								if (task && task.id === data.data.id) {
									setSelectedTask(data.data);
								}
							}
						}}
					/>
				</div>
			</SplitDialogSide>
		</SplitDialog>
	);
}
