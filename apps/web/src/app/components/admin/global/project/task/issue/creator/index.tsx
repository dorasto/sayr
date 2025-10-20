"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLabel, IconProgress, IconSlash, IconUsers } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { createTaskAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";
import { priorityConfig, statusConfig } from "../../../shared/task-config";
import GlobalTaskLabels from "../../label";
import GlobalTaskPriority from "../../priority";
import GlobalTaskStatus from "../../status";

interface Props {
	organization: schema.OrganizationWithMembers;
	project: schema.projectType;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	_labels: schema.labelType[];
	open?: boolean;
	setOpen?: (open: boolean) => void;
}

export default function CreateIssueDialog({
	organization,
	project,
	tasks,
	setTasks,
	_labels,
	open,
	setOpen = () => {
		false;
	},
}: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	// const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState<undefined | PartialBlock[]>(undefined);
	const [status, setStatus] = useState<string | undefined | null>("backlog");
	const [priority, setPriority] = useState<string | undefined | null>("none");
	const [labels, setLabels] = useState<string[]>([]);
	const { runWithToast, isFetching } = useToastAction();
	const selectedLabels = useMemo(() => _labels.filter((label) => labels.includes(label.id)), [_labels, labels]);
	const resolvedStatus = (status ?? "backlog") || "backlog";
	const resolvedPriority = (priority ?? "none") || "none";

	const draftTask = useMemo<schema.TaskWithLabels>(
		() => ({
			id: "draft",
			organizationId: organization.id,
			projectId: project.id,
			shortId: 0,
			visible: "public",
			createdAt: new Date(),
			updatedAt: new Date(),
			title,
			description: (description ?? []) as schema.TaskWithLabels["description"],
			status: resolvedStatus as schema.TaskWithLabels["status"],
			priority: resolvedPriority as schema.TaskWithLabels["priority"],
			createdBy: null,
			labels: selectedLabels,
			assignees: [],
		}),
		[description, organization.id, project.id, resolvedPriority, resolvedStatus, selectedLabels, title]
	);
	const handleUpdate = async () => {
		const data = await runWithToast(
			"create-task",
			{
				loading: { title: "Creating task...", description: "Please wait while we create the task." },
				success: { title: "Created task", description: "The task has been successfully created." },
				error: { title: "Failed to create task", description: "An error occurred while creating the task." },
			},
			() =>
				createTaskAction(
					organization.id,
					project.id,
					{
						title,
						description,
						status: resolvedStatus,
						priority: resolvedPriority,
						labels,
					},
					wsClientId
				)
		);
		if (data?.success && data.data) {
			setOpen(false);
			setTitle("");
			setDescription(undefined);
			setStatus("backlog");
			setPriority("none");
			setLabels([]);
			setTasks([...tasks, data.data]);
		}
	};
	const statusconfig = statusConfig[resolvedStatus as keyof typeof statusConfig];
	const priorityconfig = priorityConfig[resolvedPriority as keyof typeof priorityConfig];
	const selectedLabelCount = draftTask.labels.length;
	return (
		<div className="flex items-center gap-3">
			{/* <Button variant={"accent"} size={"sm"} onClick={() => setOpen(true)}>
				<IconPlus />
				<span className="text-inherit">New task</span>
			</Button> */}
			<AdaptiveDialog open={open} onOpenChange={setOpen}>
				<AdaptiveDialogContent className="z-50">
					<AdaptiveDialogHeader className="!pb-0">
						<AdaptiveDialogTitle asChild>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant={"accent"} className="w-fit text-xs h-7" size={"sm"}>
										<div className="flex items-center gap-1">
											<Avatar className="h-4 w-4 rounded-md duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
												<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
												<AvatarFallback className="rounded-md uppercase text-xs">
													<IconUsers className="h-4 w-4" />
												</AvatarFallback>
											</Avatar>
											{organization.name}
										</div>
										<IconSlash />
										<div className="flex items-center gap-1">
											<IconProgress className="!h-4 !w-4" />
											{project.name}
										</div>
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-56 p-0" align="start">
									<Button variant={"accent"} className="justify-start w-full text-xs" size={"sm"}>
										<div className="flex items-center gap-1">
											<Avatar className="h-4 w-4 rounded-md duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
												<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
												<AvatarFallback className="rounded-md uppercase text-xs">
													<IconUsers className="h-4 w-4" />
												</AvatarFallback>
											</Avatar>
											{organization.name}
										</div>
										<IconSlash />
										<div className="flex items-center gap-1">
											<IconProgress className="!h-4 !w-4" />
											{project.name}
										</div>
									</Button>
								</PopoverContent>
							</Popover>
						</AdaptiveDialogTitle>
						<AdaptiveDialogDescription className="sr-only">Create a new task</AdaptiveDialogDescription>
					</AdaptiveDialogHeader>
					<div className="flex flex-col gap-3 w-full p-3">
						<div className="flex flex-col gap-1 w-full">
							<Input
								variant={"strong"}
								placeholder="Task title"
								className="px-0 p-0"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
							<div className="w-full max-h-96 overflow-scroll">
								<Editor
									language="en"
									emptyDocumentPlaceholder="Add a description..."
									value={description}
									onChange={setDescription}
									trailing={false}
								/>
							</div>
							<div className="flex items-center gap-3 w-full">
								<GlobalTaskStatus
									task={draftTask}
									editable
									onChange={(value) => setStatus(value)}
									customTrigger={
										<Button variant={"accent"} className="w-fit text-xs h-7" size={"sm"}>
											{statusconfig?.icon(`h-3.5 w-3.5 ${statusconfig?.className || ""}`)}
											{statusconfig?.label}
										</Button>
									}
								/>
								<GlobalTaskPriority
									task={draftTask}
									editable
									onChange={(value) => setPriority(value)}
									customTrigger={
										<Button variant={"accent"} className="w-fit text-xs h-7" size={"sm"}>
											{priorityconfig?.icon(`h-3.5 w-3.5 ${priorityconfig?.className || ""}`)}
											{priorityconfig?.label}
										</Button>
									}
								/>
								<GlobalTaskLabels
									task={draftTask}
									editable
									availableLabels={_labels}
									onLabelsChange={setLabels}
									customChildren
									customTrigger={
										<Button variant={"accent"} className="w-fit text-xs h-7 line-clamp-1" size={"sm"}>
											{selectedLabelCount > 1 ? (
												<div className="flex items-center gap-2">
													<div className="flex -space-x-1">
														{draftTask.labels.map((label) => (
															<span
																key={label.id}
																className="h-2 w-2 shrink-0 rounded-full"
																style={{ backgroundColor: label.color || "#cccccc" }}
															/>
														))}
													</div>
													<span>{selectedLabelCount} labels</span>
												</div>
											) : selectedLabelCount === 1 ? (
												<div className="flex items-center">
													<span
														className="h-2 w-2 shrink-0 rounded-full mr-2"
														style={{ backgroundColor: draftTask.labels[0]?.color || "#cccccc" }}
													/>
													<span>{draftTask.labels[0]?.name}</span>
												</div>
											) : (
												<IconLabel />
											)}
										</Button>
									}
								/>
							</div>
						</div>
					</div>
					<AdaptiveDialogFooter className="mt-auto bg-background flex !flex-col gap-2">
						<div className="flex items-center gap-2 ml-auto">
							<Button variant={"accent"} onClick={handleUpdate} disabled={isFetching || !title.trim()}>
								Create task
							</Button>
						</div>
					</AdaptiveDialogFooter>
				</AdaptiveDialogContent>
			</AdaptiveDialog>
		</div>
	);
}
