"use client";
import type { PartialBlock } from "@blocknote/core";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useState } from "react";
import { useLayoutProject } from "@/app/admin/[organization_id]/[project_id]/Context";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { createTaskAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";
import Labeller from "./labels";
import { PrioritySelector } from "./priority";
import { StatusSelector } from "./status";

export default function CreateIssueDialog() {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { organization } = useLayoutOrganization();
	const { project, tasks, setTasks } = useLayoutProject();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState<undefined | PartialBlock[]>(undefined);
	const [status, setStatus] = useState<string | undefined | null>(undefined);
	const [priority, setPriority] = useState<string | undefined | null>(undefined);
	const [labels, setLabels] = useState<string[]>([]);
	const { runWithToast, isFetching } = useToastAction();
	const handleUpdate = async () => {
		const data = await runWithToast(
			"create-task",
			{
				loading: { title: "Creating task...", description: "Please wait while we create the issue." },
				success: { title: "Created issue", description: "The issue has been successfully created." },
				error: { title: "Failed to create issue", description: "An error occurred while creating the issue." },
			},
			() =>
				createTaskAction(
					organization.id,
					project.id,
					{
						title,
						description,
						status,
						priority,
						labels,
					},
					wsClientId
				)
		);
		if (data?.success && data.data) {
			setOpen(false);
			setTitle("");
			setDescription(undefined);
			setStatus(undefined);
			setPriority(undefined);
			setLabels([]);
			setTasks([...tasks, data.data]);
		}
	};
	return (
		<div className="flex items-center gap-3 w-full">
			<Button variant={"accent"} size={"sm"} onClick={() => setOpen(true)}>
				New issue
			</Button>
			<AdaptiveDialog open={open} onOpenChange={setOpen}>
				<AdaptiveDialogContent className="">
					<AdaptiveDialogHeader>
						<AdaptiveDialogTitle asChild>
							<div>
								<Label variant={"heading"} className="text-left mr-auto sr-only">
									New issue
								</Label>
								<Input
									variant={"strong"}
									placeholder="Issue title"
									className="px-0"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>
						</AdaptiveDialogTitle>
						<AdaptiveDialogDescription className="sr-only">Create a new issue</AdaptiveDialogDescription>
					</AdaptiveDialogHeader>
					<div className="flex flex-col gap-3 w-full p-3">
						<div className="flex flex-col gap-1 w-full">
							<div className="w-full max-h-96 overflow-scroll">
								<Editor language="en" value={description} onChange={setDescription} />
							</div>
							<div className="flex items-center gap-3 w-full">
								<StatusSelector value={status} onValueChange={setStatus} />
								<PrioritySelector value={priority} onValueChange={setPriority} />
								<Labeller values={labels} setValues={setLabels} />
							</div>
						</div>
					</div>
					<AdaptiveDialogFooter className="mt-auto bg-background flex !flex-col gap-2">
						<div className="flex items-center gap-2 ml-auto">
							<Button variant={"accent"} onClick={handleUpdate} disabled={isFetching || !title.trim()}>
								Create issue
							</Button>
						</div>
					</AdaptiveDialogFooter>
				</AdaptiveDialogContent>
			</AdaptiveDialog>
		</div>
	);
}
