"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { JsonViewer } from "@repo/ui/components/tomui/json-viewer";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowsDiagonal2, IconArrowsDiagonalMinimize2, IconCode, IconLink, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDebounceAsync } from "@/app/hooks/useDebounceAsync";
import { updateLabelToTaskAction, updateTaskAction } from "@/app/lib/fetches/task";
import { useToastAction } from "@/app/lib/util";
import { statusConfig } from "../../../../shared/task-config";
import GlobalTaskAssignees from "../../assignee";
import GlobalTaskCategory from "../../category";
import GlobalTaskLabels from "../../label";
import GlobalTaskPriority from "../../priority";
import GlobalTaskStatus from "../../status";
import GlobalTimeline from "../../timeline/root";

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
	ws: WebSocket | null;
	personal?: boolean;
	categories: schema.categoryType[];
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
	categories: schema.categoryType[];
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
	categories,
}: TaskContentSideContentProps) {
	const debouncedUpdateLabels = useDebounceAsync(
		async (values: string[], wsClientId: string) => {
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
						description: "Your changes are showing, but we couldn't save them to the server. Please try again.",
					},
				},
				() => updateLabelToTaskAction(task.organizationId, task.id, values, wsClientId)
			);
			return data;
		},
		1500 // debounce delay
	);
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
					const data = await debouncedUpdateLabels(values, wsClientId);
					if (data?.success && data.data && !data.skipped) {
						const finalTasks = tasks.map((t) => (t.id === task.id && data.data ? data.data : t));
						setTasks(finalTasks);
						if (task && task.id === data.data.id) {
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
				}}
			/>
			<GlobalTaskCategory
				task={task}
				editable={true}
				useInternalLogic={true}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
				categories={categories}
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
	personal = false,
	categories,
}: TaskContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const { runWithToast } = useToastAction();
	const [openData, onOpenDataChange] = useState(false);
	const pathname = usePathname();
	return !isDialog ? (
		// FULL PAGE EXPERIENCE
		<div className="flex flex-col h-full max-h-full relative">
			{/* Body of content */}
			<div className="flex gap-3 overflow-scroll">
				<div className="flex flex-col gap-3 w-full overflow-scroll overflow-x-visible p-4">
					<Label variant={"heading"} className={cn("text-left text-2xl font-bold ")}>
						{task.title}
					</Label>
					{task.githubIssue?.issueUrl}
					<JsonViewer data={task} name="task" open={openData} onOpenChange={onOpenDataChange} />
					<GlobalTimeline task={task} labels={labels} availableUsers={availableUsers} categories={categories} />
				</div>
				<div className="w-[18rem] shrink-0 overflow-y-auto p-3 ml-0 rounded-r-2xl rounded bg-card">
					<div className="flex items-center gap-2 shrink-0 w-full">
						<SimpleClipboard
							textToCopy={pathname}
							variant={"ghost"}
							className="size-5 ml-auto"
							copyIcon={<IconLink />}
							showTooltip={false}
						/>
						<Link href={`/admin/${organization.id}/tasks?task=${task.shortId}`} className="">
							<Button size="icon" className="size-5" variant="ghost">
								<IconArrowsDiagonalMinimize2 />
							</Button>
						</Link>
					</div>
					<TaskContentSideContent
						task={task}
						labels={labels}
						tasks={tasks}
						setTasks={setTasks}
						setSelectedTask={setSelectedTask}
						availableUsers={availableUsers}
						wsClientId={wsClientId}
						runWithToast={runWithToast}
						categories={categories}
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
					<div className="flex items-center gap-4 truncate">
						<Label variant={"heading"} className={cn("text-left text-lg truncate")}>
							{task.title}
						</Label>
						<Label variant={"heading"} className={cn("text-left text-sm text-muted-foreground shrink-0")}>
							#{task.shortId}
						</Label>
						{task.githubIssue?.issueUrl}
						{personal && (
							<a href={`/admin/${task.organizationId}/tasks`} onClick={(e) => e.stopPropagation()}>
								<Badge variant={"outline"} className="flex items-center gap-1 w-full justify-start shrink-0">
									<span className="text-xs truncate max-w-[150px]">{task.organization?.name}</span>
									<span className="text-xs">/</span>
									<span className="text-xs truncate max-w-[150px]">tasks</span>
								</Badge>
							</a>
						)}
					</div>
					<div className="ml-auto flex items-center gap-2 shrink-0">
						<Badge
							variant={"outline"}
							className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
						>
							{status?.icon(`${status?.className || ""}`)}
							{status.label}
						</Badge>
						<Link href={`/admin/${task.organizationId}/tasks/${task.shortId}`}>
							<Button size={"icon"} className="size-5" variant={"ghost"}>
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
			<SplitDialogContent className="relative h-full">
				<JsonViewer data={task} name="task" open={openData} onOpenChange={onOpenDataChange} />
				<GlobalTimeline task={task} labels={labels} availableUsers={availableUsers} categories={categories} />
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
					categories={categories}
				/>
			</SplitDialogSide>
		</SplitDialog>
	);
}
