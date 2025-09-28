"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { JsonViewer } from "@repo/ui/components/tomui/json-viewer";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowsDiagonal2, IconArrowsDiagonalMinimize2, IconCode, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import GlobalTaskAssignees from "../../assignee";
import GlobalTaskLabels from "../../label";
import GlobalTaskPriority from "../../priority";
import GlobalTaskStatus from "../../status";
import GlobalTimeline from "../../timeline/root";
import { updateLabelToTaskAction, updateTaskAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";
import { statusConfig } from "../../../shared/task-config";

interface TaskContentProps {
	isDialog?: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	availableUsers?: schema.userType[];
	organization: schema.OrganizationWithMembers;
	project: schema.projectType;
}

interface TaskContentSideContentProps {
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	availableUsers?: schema.userType[];
	wsClientId: string;
	runWithToast: typeof useToastAction extends () => { runWithToast: infer T } ? T : never;
}

export function TaskContentSideContent({
	task,
	labels,
	tasks,
	setTasks,
	setSelectedTask,
	availableUsers = [],
	wsClientId,
	runWithToast,
}: TaskContentSideContentProps) {
	return (
		<div className="flex flex-col gap-3">
			{/* <GlobalTaskCreatedAt task={task} />
					<Separator /> */}

			<GlobalTaskStatus
				task={task}
				editable={true}
				useInternalLogic={true}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
			/>
			<GlobalTaskAssignees
				task={task}
				editable={true}
				availableUsers={availableUsers}
				useInternalLogic={true}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
			/>
			<GlobalTaskLabels
				task={task}
				editable={true}
				availableLabels={labels}
				onLabelsChange={async (values) => {
					const updatedTasks = tasks.map((t) =>
						t.id === task.id ? { ...task, labels: labels.filter((label) => values.includes(label.id)) } : t
					);
					setTasks(updatedTasks);
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
									"Your changes are showing, but we couldn't save them to the server. Please try again.",
							},
						},
						() => updateLabelToTaskAction(task.organizationId, task.projectId, task.id, values, wsClientId)
					);
					if (data?.success && data.data) {
						const finalTasks = tasks.map((t) => (t.id === task.id && data.data ? data.data : t));
						setTasks(finalTasks);
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
					const updatedTasks = tasks.map((t) =>
						t.id === task.id ? { ...task, priority: value as schema.TaskWithLabels["priority"] } : t
					);
					setTasks(updatedTasks);
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
									"Your changes are showing, but we couldn't save them to the server. Please try again.",
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
						const finalTasks = tasks.map((t) => (t.id === task.id && data.data ? data.data : t));
						setTasks(finalTasks);
						if (task && task.id === data.data.id) {
							setSelectedTask(data.data);
						}
					}
				}}
			/>
		</div>
	);
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
	isDialog = true,
	organization,
	project,
}: TaskContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const { runWithToast } = useToastAction();
	const [openData, onOpenDataChange] = useState(false);
	return !isDialog ? (
		// FULL PAGE EXPERIENCE
		<div className="flex flex-col gap-3 h-full max-h-full relative">
			<div className="flex flex-col gap-1 max-w-3/4 relative">
				<div className="flex items-center gap-2 shrink-0 rounded-2xl border px-2.5 py-0.5 h-7 shadow-xs w-fit">
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href={`/admin/${task.organizationId}`}>{organization.name}</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink href={`/admin/${task.organizationId}/${task.projectId}`}>
									{project.name}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>#{task.shortId}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<Separator orientation="vertical" className="h-4" />
					<div className="flex items-center gap-2 shrink-0">
						<Button
							size={"icon"}
							className="size-5"
							variant={openData ? "accent" : "ghost"}
							onClick={() => onOpenDataChange(!openData)}
						>
							<IconCode />
						</Button>
						<Link
							href={`/admin/${task.organizationId}/${task.projectId}`}
							// WHEN WE ADD PARAMS TO OPEN A TASK ON THE PROJECT PAGE, MAKE THIS AUTO OPEN IT THERE LIKE /admin/${task.organizationId}/${task.projectId}?task=${task.shortId}
							className="size-5"
						>
							<Button size={"icon"} className="size-5" variant={"ghost"}>
								<IconArrowsDiagonalMinimize2 />
							</Button>
						</Link>
					</div>
				</div>
				<div className="flex items-center w-full gap-3">
					<Label variant={"heading"} className={cn("text-left text-xl truncate")}>
						{task.title}
					</Label>
					<Badge
						variant={"outline"}
						className="flex items-center h-7 flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
					>
						{status?.icon(`${status?.className || ""}`)}
						{status.label}
					</Badge>
				</div>
			</div>
			<div className="flex gap-3 overflow-scroll flex-1">
				<div className="flex flex-col gap-3 w-full overflow-scroll overflow-x-visible p-4">
					<JsonViewer data={task} name="task" open={openData} onOpenChange={onOpenDataChange} />
					<GlobalTimeline task={task} labels={labels} availableUsers={availableUsers} />
				</div>
				<div className="w-1/4 shrink-0 overflow-y-auto">
					<TaskContentSideContent
						task={task}
						labels={labels}
						tasks={tasks}
						setTasks={setTasks}
						setSelectedTask={setSelectedTask}
						availableUsers={availableUsers}
						wsClientId={wsClientId}
						runWithToast={runWithToast}
					/>
				</div>
			</div>
		</div>
	) : (
		// DIALOG /DEFAULT EXPERIENCE
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
								<IconArrowsDiagonal2 />
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

				<GlobalTimeline task={task} labels={labels} availableUsers={availableUsers} />
			</SplitDialogContent>
			<SplitDialogSide className="p-2">
				<TaskContentSideContent
					task={task}
					labels={labels}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					availableUsers={availableUsers}
					wsClientId={wsClientId}
					runWithToast={runWithToast}
				/>
			</SplitDialogSide>
		</SplitDialog>
	);
}
