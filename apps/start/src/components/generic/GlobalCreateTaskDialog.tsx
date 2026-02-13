"use client";

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
import { Textarea } from "@repo/ui/components/textarea";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconBuilding, IconLoader2 } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useLayoutData } from "@/components/generic/Context";
import { statusConfig } from "@/components/tasks/shared/config";
import { priorityConfig } from "@/components/tasks/shared/config";
import { createTaskAction } from "@/lib/fetches/task";
import { commandActions, commandStore } from "@/lib/command-store";
import { useToastAction } from "@/lib/util";

/**
 * A global, org-agnostic task creation dialog that can be triggered from anywhere.
 * Reads open state from commandStore.createTaskDialog.
 * If orgId is pre-set, skips org selection. Otherwise shows an org picker.
 */
export function GlobalCreateTaskDialog() {
	const navigate = useNavigate();
	const dialogState = useStore(commandStore, (state) => state.createTaskDialog);
	const { organizations } = useLayoutData();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();

	const [selectedOrgId, setSelectedOrgId] = useState<string>("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState("backlog");
	const [priority, setPriority] = useState("none");

	// Sync pre-selected org from store
	useEffect(() => {
		if (dialogState.open) {
			if (dialogState.orgId) {
				setSelectedOrgId(dialogState.orgId);
			} else if (organizations.length === 1 && organizations[0]) {
				setSelectedOrgId(organizations[0].id);
			}
		}
	}, [dialogState.open, dialogState.orgId, organizations]);

	const selectedOrg = useMemo(
		() => organizations.find((o) => o.id === selectedOrgId),
		[organizations, selectedOrgId],
	);

	const resetForm = useCallback(() => {
		setTitle("");
		setDescription("");
		setStatus("backlog");
		setPriority("none");
		setSelectedOrgId("");
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				commandActions.closeCreateTaskDialog();
				// Delay reset so dialog animates out first
				setTimeout(resetForm, 200);
			}
		},
		[resetForm],
	);

	const handleCreate = async () => {
		if (!selectedOrgId || !title.trim()) return;

		// Build a minimal ProseMirror-style doc from plain text
		const descriptionDoc = description.trim()
			? {
					type: "doc" as const,
					content: description.split("\n").map((line) => ({
						type: "paragraph" as const,
						content: line ? [{ type: "text" as const, text: line }] : [],
					})),
				}
			: undefined;

		const data = await runWithToast(
			"global-create-task",
			{
				loading: { title: "Creating task...", description: "Please wait." },
				success: { title: "Task created", description: "Your task has been created." },
				error: { title: "Failed to create task", description: "Something went wrong." },
			},
			() =>
				createTaskAction(
					selectedOrgId,
					{
						title: title.trim(),
						description: descriptionDoc,
						status,
						priority,
						labels: [],
					},
					wsClientId,
				),
		);

		if (data?.success && data.data) {
			commandActions.closeCreateTaskDialog();
			resetForm();
			navigate({
				to: "/$orgId/tasks/$taskShortId",
				params: {
					orgId: selectedOrgId,
					taskShortId: data.data.shortId?.toString() || "0",
				},
			});
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleCreate();
		}
	};

	const statusOptions = Object.entries(statusConfig) as [string, (typeof statusConfig)[keyof typeof statusConfig]][];
	const priorityOptions = Object.entries(priorityConfig) as [
		string,
		(typeof priorityConfig)[keyof typeof priorityConfig],
	][];

	return (
		<AdaptiveDialog open={dialogState.open} onOpenChange={handleOpenChange}>
			<AdaptiveDialogContent
				className="z-50 border md:max-w-[min(32rem,calc(100vw-2rem))]!"
				showClose={false}
				onKeyDown={handleKeyDown}
			>
				<AdaptiveDialogHeader>
					<AdaptiveDialogTitle>Create task</AdaptiveDialogTitle>
					<AdaptiveDialogDescription className="sr-only">
						Create a new task in any organization
					</AdaptiveDialogDescription>
				</AdaptiveDialogHeader>

				<div className="flex flex-col gap-3 p-3 pt-0">
					{/* Org picker - show when multiple orgs and none pre-selected */}
					{organizations.length > 1 && (
						<Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
							<SelectTrigger className="w-full">
								<IconBuilding className="h-4 w-4 opacity-60 mr-2" />
								<SelectValue placeholder="Select organization..." />
							</SelectTrigger>
							<SelectContent>
								{organizations.map((org) => (
									<SelectItem key={org.id} value={org.id}>
										{org.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* Show org name when single org */}
					{organizations.length === 1 && selectedOrg && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<IconBuilding className="h-4 w-4 opacity-60" />
							<span>{selectedOrg.name}</span>
						</div>
					)}

					<Input
						variant="strong"
						placeholder="Task title"
						className="px-0 p-0"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						autoFocus
					/>

					<Textarea
						placeholder="Description (optional)"
						className="min-h-20 resize-none text-sm"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
					/>

					<div className="flex items-center gap-2 flex-wrap">
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className="w-fit h-7 text-xs gap-1">
								{statusConfig[status as keyof typeof statusConfig]?.icon(
									`h-3.5 w-3.5 ${statusConfig[status as keyof typeof statusConfig]?.className || ""}`,
								)}
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{statusOptions.map(([key, config]) => (
									<SelectItem key={key} value={key}>
										<div className="flex items-center gap-2">
											{config.icon(`h-3.5 w-3.5 ${config.className || ""}`)}
											{config.label}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={priority} onValueChange={setPriority}>
							<SelectTrigger className="w-fit h-7 text-xs gap-1">
								{priorityConfig[priority as keyof typeof priorityConfig]?.icon(
									`h-3.5 w-3.5 ${priorityConfig[priority as keyof typeof priorityConfig]?.className || ""}`,
								)}
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{priorityOptions.map(([key, config]) => (
									<SelectItem key={key} value={key}>
										<div className="flex items-center gap-2">
											{config.icon(`h-3.5 w-3.5 ${config.className || ""}`)}
											{config.label}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<AdaptiveDialogFooter className="mt-auto bg-background shrink-0">
					<div className="flex items-center justify-between w-full">
						<span className="text-xs text-muted-foreground">
							{navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to create
						</span>
						<Button
							variant="primary"
							className="h-7"
							onClick={handleCreate}
							disabled={isFetching || !title.trim() || !selectedOrgId}
						>
							{isFetching ? <IconLoader2 className="h-4 w-4 animate-spin mr-1" /> : null}
							Create
						</Button>
					</div>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
