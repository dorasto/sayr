"use client";

import { useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
	IconCategory,
	IconChevronDown,
	IconDeviceFloppy,
	IconLabel,
	IconPlus,
	IconTemplate,
	IconTrash,
	IconUserPlus,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
	createIssueTemplateAction,
	deleteIssueTemplateAction,
	editIssueTemplateAction,
} from "@/lib/fetches/organization";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import GlobalTaskStatus from "@/components/tasks/shared/status";
import GlobalTaskPriority from "@/components/tasks/shared/priority";
import GlobalTaskLabels from "@/components/tasks/shared/label";
import GlobalTaskCategory from "@/components/tasks/shared/category";
import GlobalTaskAssignees from "@/components/tasks/shared/assignee";
import RenderIcon from "@/components/generic/RenderIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/accordion";
import { Label } from "@repo/ui/components/label";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { formatDateCompact } from "@repo/util";
import Editor from "@/components/prosekit/editor";
import processUploads from "@/components/prosekit/upload";
import type { NodeJSON } from "prosekit/core";

interface Props {
	orgId: string;
	setIssueTemplates: (newValue: schema.issueTemplateWithRelations[]) => void;
	template?: schema.issueTemplateWithRelations;
	availableLabels: schema.labelType[];
	availableCategories: schema.categoryType[];
	availableUsers: schema.userType[];
	mode?: "create" | "edit";
	settingsUI?: boolean;
}

export default function CreateIssueTemplate({
	orgId,
	setIssueTemplates,
	template,
	availableLabels,
	availableCategories,
	availableUsers,
	mode = "create",
	settingsUI = false,
}: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState(template?.name || "");
	const [titlePrefix, setTitlePrefix] = useState(template?.titlePrefix || "");
	const [description, setDescription] = useState<NodeJSON | undefined>(
		template?.description ? (template.description as NodeJSON) : undefined
	);
	const [status, setStatus] = useState<string | undefined>(template?.status || undefined);
	const [priority, setPriority] = useState<string | undefined>(template?.priority || undefined);
	const [categoryId, setCategoryId] = useState<string>(template?.categoryId || "");
	const [labelIds, setLabelIds] = useState<string[]>(template?.labels?.map((l) => l.id) || []);
	const [assigneeIds, setAssigneeIds] = useState<string[]>(template?.assignees?.map((a) => a.id) || []);
	const { runWithToast, isFetching } = useToastAction();
	const isEditMode = mode === "edit" && template;
	const [resetKey, setResetKey] = useState(0);

	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const initialContent = useMemo(() => {
		return template?.description ? (template.description as NodeJSON) : undefined;
	}, [template?.id]);

	useEffect(() => {
		if (isEditMode) {
			setName(template?.name || "");
			setTitlePrefix(template?.titlePrefix || "");
			setDescription(template?.description ? (template.description as NodeJSON) : undefined);
			setStatus(template?.status || undefined);
			setPriority(template?.priority || undefined);
			setCategoryId(template?.categoryId || "");
			setLabelIds(template?.labels?.map((l) => l.id) || []);
			setAssigneeIds(template?.assignees?.map((a) => a.id) || []);
		}
	}, [isEditMode, template]);

	const hasChanges = useMemo(() => {
		if (!isEditMode) return true;
		return (
			name !== template?.name ||
			titlePrefix !== (template?.titlePrefix || "") ||
			JSON.stringify(description) !== JSON.stringify(template?.description || undefined) ||
			status !== (template?.status || undefined) ||
			priority !== (template?.priority || undefined) ||
			categoryId !== (template?.categoryId || "") ||
			JSON.stringify(labelIds.sort()) !== JSON.stringify((template?.labels?.map((l) => l.id) || []).sort()) ||
			JSON.stringify(assigneeIds.sort()) !== JSON.stringify((template?.assignees?.map((a) => a.id) || []).sort())
		);
	}, [name, titlePrefix, description, status, priority, categoryId, labelIds, assigneeIds, template, isEditMode]);

	const selectedLabels = useMemo(
		() => availableLabels.filter((label) => labelIds.includes(label.id)),
		[availableLabels, labelIds]
	);

	const selectedCategory = useMemo(
		() => availableCategories.find((c) => c.id === categoryId),
		[availableCategories, categoryId]
	);

	const selectedAssignees = useMemo(
		() => availableUsers.filter((user) => assigneeIds.includes(user.id)),
		[availableUsers, assigneeIds]
	);

	// Create a draft task-like object for the shared components
	const draftTask = useMemo<schema.TaskWithLabels>(
		() => ({
			id: template?.id || "draft",
			organizationId: orgId,
			shortId: 0,
			visible: "public",
			createdAt: new Date(),
			updatedAt: new Date(),
			title: "",
			description: [] as schema.NodeJSON,
			status: (status || "backlog") as schema.TaskWithLabels["status"],
			priority: (priority || "none") as schema.TaskWithLabels["priority"],
			createdBy: null,
			labels: selectedLabels,
			assignees: selectedAssignees,
			category: categoryId || "",
		}),
		[orgId, template?.id, status, priority, selectedLabels, selectedAssignees, categoryId]
	);

	const resolvedStatus = status || "backlog";
	const resolvedPriority = priority || "none";
	const statusconfig = statusConfig[resolvedStatus as keyof typeof statusConfig];
	const priorityconfig = priorityConfig[resolvedPriority as keyof typeof priorityConfig];

	const handleCreate = async () => {
		const data = await runWithToast(
			"create-issue-template",
			{
				loading: {
					title: "Creating template...",
					description: "Please wait while we create the template.",
				},
				success: {
					title: "Template created",
					description: "The template has been successfully created.",
				},
				error: {
					title: "Failed to create template",
					description: "An error occurred while creating the template.",
				},
			},
			async () => {
				const updatedDescription = description
					? await processUploads(description, "public", orgId, "create-issue-template")
					: undefined;

				return createIssueTemplateAction(
					orgId,
					{
						name,
						titlePrefix: titlePrefix || undefined,
						description: updatedDescription,
						status: status || undefined,
						priority: priority || undefined,
						categoryId: categoryId || undefined,
						labelIds,
						assigneeIds,
					},
					wsClientId
				);
			}
		);
		if (data?.success && data.data) {
			setIssueTemplates(data.data);
			setName("");
			setTitlePrefix("");
			setDescription(undefined);
			setStatus(undefined);
			setPriority(undefined);
			setCategoryId("");
			setLabelIds([]);
			setAssigneeIds([]);
			setResetKey((prev) => prev + 1);
		}
	};

	const handleEdit = async () => {
		if (!template) return;
		const data = await runWithToast(
			"edit-issue-template",
			{
				loading: {
					title: "Updating template...",
				},
				success: {
					title: "Template updated",
				},
				error: {
					title: "Failed to update template",
					description: "An error occurred while updating the template.",
				},
			},
			async () => {
				const updatedDescription = description
					? await processUploads(description, "public", orgId, "edit-issue-template")
					: undefined;

				return editIssueTemplateAction(
					orgId,
					{
						id: template.id,
						name,
						titlePrefix: titlePrefix || undefined,
						description: updatedDescription,
						status: status || undefined,
						priority: priority || undefined,
						categoryId: categoryId || undefined,
						labelIds,
						assigneeIds,
					},
					wsClientId
				);
			}
		);
		if (data?.success && data.data) {
			setIssueTemplates(data.data);
		}
	};

	const handleDelete = async () => {
		if (!template) return;
		const data = await runWithToast(
			"delete-issue-template",
			{
				loading: {
					title: "Deleting template...",
					description: "Please wait while we delete the template.",
				},
				success: {
					title: "Template deleted",
					description: "The template has been successfully deleted.",
				},
				error: {
					title: "Failed to delete template",
					description: "An error occurred while deleting the template.",
				},
			},
			() => deleteIssueTemplateAction(orgId, { id: template.id }, wsClientId)
		);
		if (data?.success && data.data) {
			setConfirmDeleteOpen(false);
			setIssueTemplates(data.data);
		}
	};

	return (
		<AccordionItem
			value={template?.id || "create"}
			className={cn(
				"bg-card hover:bg-accent data-[state=open]:bg-accent overflow-hidden p-0 border-0 rounded-lg",
				settingsUI && ""
			)}
		>
			<AccordionTrigger showChevron={false} className="p-0 overflow-hidden flex items-center justify-between pr-3">
				<Tile variant={"transparent"} className="md:w-full cursor-pointer">
					<TileHeader className="w-full text-left">
						<TileTitle className="flex items-center gap-2 w-full">
							<TileIcon>
								<IconTemplate />
							</TileIcon>
							{template?.name || "Create new"}
						</TileTitle>
						{isEditMode && (
							<TileDescription>
								<Label variant={"description"}>
									Created on {formatDateCompact(template.createdAt as Date)}
								</Label>
							</TileDescription>
						)}
					</TileHeader>
				</Tile>
				<IconChevronDown className="transition-all size-4" />
				{/*<div className="flex items-center gap-2 flex-1">
          <IconTemplate className="h-5 w-5 text-muted-foreground shrink-0" />
          {isEditMode ? (
            <>
              <Label variant={"heading"}>{template.name}</Label>
              {titlePrefix && (
                <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">
                  {titlePrefix}
                </span>
              )}
              <div className="flex items-center gap-1 mr-2">
                {statusconfig?.icon(`h-4 w-4 ${statusconfig?.className || ""}`)}
                {priorityconfig?.icon(
                  `h-4 w-4 ${priorityconfig?.className || ""}`,
                )}
                {selectedLabels.length > 0 && (
                  <div className="flex -space-x-1">
                    {selectedLabels.slice(0, 3).map((label) => (
                      <span
                        key={label.id}
                        className="h-3 w-3 rounded-full border border-background"
                        style={{ backgroundColor: label.color || "#cccccc" }}
                      />
                    ))}
                    {selectedLabels.length > 3 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{selectedLabels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Create new template</span>
          )}
        </div>*/}
			</AccordionTrigger>

			<AccordionContent className="p-3 flex flex-col gap-3 bg-card">
				<div className="flex flex-col md:flex-row md:items-center gap-2">
					<Input
						placeholder="Template name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="bg-accent border-transparent md:w-2/3"
					/>
					<Input
						placeholder="[BUG]"
						value={titlePrefix}
						onChange={(e) => setTitlePrefix(e.target.value)}
						className="bg-accent border-transparent md:w-1/3"
					/>
				</div>

				<div className="w-full max-h-64 overflow-scroll border p-3 rounded-lg bg-accent">
					<Editor
						key={template?.id || `new-${resetKey}`}
						onChange={setDescription}
						defaultContent={initialContent}
						users={availableUsers}
						categories={availableCategories}
						tasks={[]}
					/>
				</div>

				<div className="flex items-center flex-wrap gap-1">
					<GlobalTaskStatus
						task={draftTask}
						editable
						onChange={(value) => setStatus(value || undefined)}
						customTrigger={
							<Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
								{statusconfig?.icon(`h-3.5 w-3.5 ${statusconfig?.className || ""}`)}
								{statusconfig?.label || "Status"}
							</Button>
						}
					/>
					<GlobalTaskPriority
						task={draftTask}
						editable
						onChange={(value) => setPriority(value || undefined)}
						customTrigger={
							<Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
								{priorityconfig?.icon(`h-3.5 w-3.5 ${priorityconfig?.className || ""}`)}
								{priorityconfig?.label || "Priority"}
							</Button>
						}
					/>
					<GlobalTaskLabels
						task={draftTask}
						editable
						availableLabels={availableLabels}
						onLabelsChange={setLabelIds}
						customChildren
						customTrigger={
							<Button variant={"primary"} className="w-fit text-xs h-7 line-clamp-1" size={"sm"}>
								{selectedLabels.length > 1 ? (
									<div className="flex items-center gap-2">
										<div className="flex -space-x-1">
											{selectedLabels.map((label) => (
												<span
													key={label.id}
													className="h-2 w-2 shrink-0 rounded-full"
													style={{
														backgroundColor: label.color || "#cccccc",
													}}
												/>
											))}
										</div>
										<span>{selectedLabels.length} labels</span>
									</div>
								) : selectedLabels.length === 1 ? (
									<div className="flex items-center">
										<span
											className="h-2 w-2 shrink-0 rounded-full mr-2"
											style={{
												backgroundColor: selectedLabels[0]?.color || "#cccccc",
											}}
										/>
										<span>{selectedLabels[0]?.name}</span>
									</div>
								) : (
									<span className="flex items-center gap-2">
										<IconLabel className="h-3.5 w-3.5 mr-1" />
										Labels
									</span>
								)}
							</Button>
						}
					/>
					<GlobalTaskAssignees
						task={draftTask}
						editable
						availableUsers={availableUsers}
						onChange={(value) => setAssigneeIds(value)}
						customTrigger={
							<Button variant={"primary"} className="w-fit text-xs h-7 line-clamp-1" size={"sm"}>
								{selectedAssignees.length > 1 ? (
									<div className="flex items-center gap-2">
										<div className="flex -space-x-1">
											{selectedAssignees.map((assignee) => (
												<Avatar key={assignee.id} className="h-4 w-4 border border-background">
													<AvatarImage src={assignee.image || undefined} alt={assignee.name} />
													<AvatarFallback className="text-[8px]">
														{assignee.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase()
															.slice(0, 2)}
													</AvatarFallback>
												</Avatar>
											))}
										</div>
										<span>{selectedAssignees.length} assignees</span>
									</div>
								) : selectedAssignees.length === 1 ? (
									<div className="flex items-center">
										<Avatar className="h-4 w-4 mr-2">
											<AvatarImage
												src={selectedAssignees[0]?.image || undefined}
												alt={selectedAssignees[0]?.name}
											/>
											<AvatarFallback className="text-[8px]">
												{selectedAssignees[0]?.name
													.split(" ")
													.map((n) => n[0])
													.join("")
													.toUpperCase()
													.slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<span>{selectedAssignees[0]?.name}</span>
									</div>
								) : (
									<span className="flex items-center gap-2">
										<IconUserPlus className="h-3.5 w-3.5 mr-1" />
										Assignees
									</span>
								)}
							</Button>
						}
					/>
					<GlobalTaskCategory
						task={draftTask}
						editable
						categories={availableCategories}
						onChange={(value) => setCategoryId(value)}
						customTrigger={
							<Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
								{selectedCategory ? (
									<>
										<RenderIcon
											iconName={selectedCategory.icon || "IconCircleFilled"}
											className="size-3.5! [&_svg]:size-3.5! mr-1"
											color={selectedCategory.color || undefined}
											button
										/>
										{selectedCategory.name}
									</>
								) : (
									<>
										<IconCategory className="h-3.5 w-3.5 mr-1" />
										Category
									</>
								)}
							</Button>
						}
					/>
				</div>
				<div className="ml-auto">
					{isEditMode ? (
						<div className="flex items-center gap-1 w-full">
							<Popover open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="primary"
										size="sm"
										className="h-7 w-7 p-1 text-xs border-destructive/30 hover:border-destructive hover:bg-destructive/30"
									>
										<IconTrash className="h-4 w-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-4 w-60 flex flex-col gap-3 bg-card border border-muted shadow-md">
									<p className="text-sm text-muted-foreground">
										Are you sure you want to delete this template?
									</p>
									<div className="flex justify-end gap-2">
										<Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(false)}>
											Cancel
										</Button>
										<Button variant="destructive" size="sm" onClick={handleDelete}>
											Delete
										</Button>
									</div>
								</PopoverContent>
							</Popover>
							{hasChanges && (
								<Button
									variant="primary"
									size="sm"
									className="h-7 p-1 text-xs border-primary/30 hover:border-primary hover:bg-primary/30"
									onClick={handleEdit}
									disabled={isFetching || name.length === 0}
								>
									<IconDeviceFloppy className="" />
								</Button>
							)}
						</div>
					) : (
						<Button
							variant="primary"
							size="sm"
							className="h-7 p-1 text-xs border-primary/30 hover:border-primary hover:bg-primary/30"
							onClick={handleCreate}
							disabled={isFetching || name.length === 0}
						>
							<IconPlus className="h-4 w-4" />
							Create
						</Button>
					)}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
