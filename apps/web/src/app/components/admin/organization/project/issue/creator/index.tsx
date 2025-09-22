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
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useLayoutProject } from "@/app/admin/[organization_id]/[project_id]/Context";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { createTaskAction } from "@/app/lib/fetches";
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
	// Mutation for updating organization
	const updateMutation = useMutation({
		mutationFn: async (data: {
			title: string;
			description: PartialBlock[] | undefined;
			status: string | undefined | null;
			priority: string | undefined | null;
			labels: string[];
		}) => {
			headlessToast.loading({
				id: "create-issue",
				title: "Creating issue...",
				description: "Please wait while we create the issue.",
			});
			const result = await createTaskAction(organization.id, project.id, data, wsClientId);
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
		},
		onSuccess: (data) => {
			headlessToast.success({
				id: "create-issue",
				title: "Created issue",
				description: "The issue has been successfully created.",
			});
			setOpen(false);
			setTitle("");
			setDescription(undefined);
			setStatus(undefined);
			setPriority(undefined);
			setLabels([]);
			setTasks([...tasks, data]);
		},
		onError: (error) => {
			headlessToast.error({
				id: "create-issue",
				title: "Failed to create issue",
				description: error.message || "An error occurred while creating the issue.",
			});
		},
	});
	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();

			try {
				updateMutation.mutate({
					title,
					description,
					status,
					priority,
					labels,
				});
				// biome-ignore lint/suspicious/noExplicitAny: <any>
			} catch (error: any) {
				console.error("Upload/Update failed:", error);
				headlessToast.error({
					id: "create-issue",
					title: "Failed to create issue",
					description: error.message || "An error occurred while creating the issue.",
				});
			}
		},
		[title, description, status, priority, labels, updateMutation]
	);
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
							<Button
								variant={"accent"}
								onClick={handleSubmit}
								disabled={updateMutation.isPending || !title.trim()}
							>
								Create issue
							</Button>
						</div>
					</AdaptiveDialogFooter>
				</AdaptiveDialogContent>
			</AdaptiveDialog>
		</div>
	);
}
