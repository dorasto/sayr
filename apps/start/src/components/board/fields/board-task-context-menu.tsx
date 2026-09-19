import type { schema } from "@repo/database";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { formatTaskKey } from "@repo/util";
import { IconCategory, IconExternalLink, IconRocket, IconTag, IconUser } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { updateAssigneesToTaskAction, updateLabelToTaskAction } from "@/lib/fetches/task";
import {
	PRIORITY_CONFIG,
	type PriorityValue,
	STATUS_CONFIG,
	type StatusValue,
	VISIBILITY_CONFIG,
	type VisibilityValue,
} from "../config/field-config";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface BoardTaskContextMenuProps {
	task: schema.TaskWithLabels;
	children: ReactElement;
}

/**
 * Right-click menu for a board row/card — the same field-update actions the
 * inline pickers (field-status.tsx, field-priority.tsx, etc.) expose,
 * surfaced as a context menu instead of a click-to-open ComboBox. Wraps
 * `children` (the row's own Link, or the card's outer div) directly as the
 * ContextMenuTrigger's render target rather than adding a second wrapping
 * interactive element.
 */
export function BoardTaskContextMenu({ task, children }: BoardTaskContextMenuProps) {
	const { categories, releases, labels, tasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useBoardTaskFieldAction(task);

	const availableCategories = categories.filter((category) => category.organizationId === task.organizationId);
	const availableReleases = releases.filter((release) => release.organizationId === task.organizationId);
	const availableLabels = labels.filter((label) => label.organizationId === task.organizationId);
	const availableUsers = (() => {
		const users = new Map<string, schema.UserSummary>();
		for (const orgTask of tasks) {
			if (orgTask.organizationId !== task.organizationId) continue;
			for (const user of orgTask.assignees) users.set(user.id, user);
		}
		return Array.from(users.values());
	})();

	const assigneeIds = task.assignees.map((assignee) => assignee.id);
	const labelIds = task.labels.map((label) => label.id);

	return (
		<ContextMenu>
			<ContextMenuTrigger render={children} />
			<ContextMenuContent className="w-56">
				<ContextMenuGroup>
					<ContextMenuLabel className="truncate">
						{task.organization ? formatTaskKey(task.organization.shortId, task.shortId) : task.shortId} —{" "}
						{task.title || "Untitled"}
					</ContextMenuLabel>
				</ContextMenuGroup>
				<ContextMenuSeparator />

				<Link
					to="/$orgId/tasks/$taskShortId"
					params={{ orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() }}
				>
					<ContextMenuItem className="gap-3 w-full">
						<IconExternalLink className="size-4" />
						Open task
					</ContextMenuItem>
				</Link>

				<ContextMenuSeparator />

				{/* Status */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						{STATUS_CONFIG[task.status as StatusValue].icon("size-3.5")}
						Status
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-44">
						<ContextMenuRadioGroup
							value={task.status}
							onValueChange={(value) => {
								const status = value as StatusValue;
								execute({
									kind: "single",
									field: "status",
									updateData: { status },
									optimisticTask: { ...task, status },
									toastMessages: {
										loading: { title: "Updating status..." },
										success: {
											title: "Status updated",
											description: `Changed to ${STATUS_CONFIG[status].label}`,
										},
										error: { title: "Failed to update status" },
									},
								});
							}}
						>
							{(Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => (
								<ContextMenuRadioItem key={status} value={status} showDot={false}>
									<div className="flex items-center gap-2">
										{STATUS_CONFIG[status].icon("size-4")}
										<span>{STATUS_CONFIG[status].label}</span>
									</div>
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Priority */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						{PRIORITY_CONFIG[task.priority as PriorityValue].icon("size-3.5")}
						Priority
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-44">
						<ContextMenuRadioGroup
							value={task.priority}
							onValueChange={(value) => {
								const priority = value as PriorityValue;
								execute({
									kind: "single",
									field: "priority",
									updateData: { priority },
									optimisticTask: { ...task, priority },
									toastMessages: {
										loading: { title: "Updating priority..." },
										success: {
											title: "Priority updated",
											description: `Changed to ${PRIORITY_CONFIG[priority].label}`,
										},
										error: { title: "Failed to update priority" },
									},
								});
							}}
						>
							{(Object.keys(PRIORITY_CONFIG) as PriorityValue[]).map((priority) => (
								<ContextMenuRadioItem key={priority} value={priority} showDot={false}>
									<div className="flex items-center gap-2">
										{PRIORITY_CONFIG[priority].icon("size-4")}
										<span>{PRIORITY_CONFIG[priority].label}</span>
									</div>
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Visibility */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						{VISIBILITY_CONFIG[task.visible].icon("size-3.5")}
						Visibility
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-40">
						<ContextMenuRadioGroup
							value={task.visible}
							onValueChange={(value) => {
								const visible = value as VisibilityValue;
								execute({
									kind: "single",
									field: "visibility",
									updateData: { visible },
									optimisticTask: { ...task, visible },
									toastMessages: {
										loading: { title: "Updating visibility..." },
										success: { title: "Visibility updated", description: `Task is now ${visible}` },
										error: { title: "Failed to update visibility" },
									},
								});
							}}
						>
							{(Object.keys(VISIBILITY_CONFIG) as VisibilityValue[]).map((visible) => (
								<ContextMenuRadioItem key={visible} value={visible} showDot={false}>
									<div className="flex items-center gap-2">
										{VISIBILITY_CONFIG[visible].icon("size-4")}
										<span>{VISIBILITY_CONFIG[visible].label}</span>
									</div>
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSeparator />

				{/* Assignees */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						<IconUser className="size-3.5" />
						Assignees
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto">
						{availableUsers.length > 0 ? (
							availableUsers.map((user) => {
								const isAssigned = assigneeIds.includes(user.id);
								return (
									<ContextMenuCheckboxItem
										key={user.id}
										checked={isAssigned}
										side="right"
										closeOnClick={false}
										onClick={() => {
											const nextIds = isAssigned
												? assigneeIds.filter((id) => id !== user.id)
												: [...assigneeIds, user.id];
											const assignees = availableUsers.filter((u) => nextIds.includes(u.id));
											execute({
												kind: "multi",
												actionId: "update-task-assignees",
												apiFn: () =>
													updateAssigneesToTaskAction(task.organizationId, task.id, nextIds, sseClientId),
												optimisticTask: { ...task, assignees },
												toastMessages: {
													loading: { title: "Updating assignees..." },
													success: { title: "Assignees updated" },
													error: { title: "Failed to update assignees" },
												},
											});
										}}
									>
										<span className="text-sm truncate">{user.name ?? "Unknown user"}</span>
									</ContextMenuCheckboxItem>
								);
							})
						) : (
							<ContextMenuItem disabled>No users available</ContextMenuItem>
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Labels */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						<IconTag className="size-3.5" />
						Labels
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto">
						{availableLabels.length > 0 ? (
							availableLabels.map((label) => {
								const isApplied = labelIds.includes(label.id);
								return (
									<ContextMenuCheckboxItem
										key={label.id}
										checked={isApplied}
										side="right"
										closeOnClick={false}
										onClick={() => {
											const nextIds = isApplied
												? labelIds.filter((id) => id !== label.id)
												: [...labelIds, label.id];
											const nextLabels = availableLabels.filter((l) => nextIds.includes(l.id));
											execute({
												kind: "multi",
												actionId: "update-task-labels",
												apiFn: () =>
													updateLabelToTaskAction(task.organizationId, task.id, nextIds, sseClientId),
												optimisticTask: { ...task, labels: nextLabels },
												toastMessages: {
													loading: { title: "Updating labels..." },
													success: { title: "Labels updated" },
													error: { title: "Failed to update labels" },
												},
											});
										}}
									>
										<div className="flex items-center gap-2 truncate">
											<span
												className="size-2 rounded-full shrink-0"
												style={{ backgroundColor: label.color ?? "#9CA3AF" }}
											/>
											<span className="text-sm truncate">{label.name}</span>
										</div>
									</ContextMenuCheckboxItem>
								);
							})
						) : (
							<ContextMenuItem disabled>No labels available</ContextMenuItem>
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Category */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						<IconCategory className="size-3.5" />
						Category
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto">
						<ContextMenuRadioGroup
							value={task.category ?? "none"}
							onValueChange={(value) => {
								const category = value === "none" ? null : value;
								execute({
									kind: "single",
									field: "category",
									updateData: { category },
									optimisticTask: { ...task, category },
									toastMessages: {
										loading: { title: category ? "Updating category..." : "Removing category..." },
										success: { title: category ? "Category updated" : "Category removed" },
										error: { title: "Failed to update category" },
									},
								});
							}}
						>
							<ContextMenuRadioItem value="none" showDot={false}>
								No category
							</ContextMenuRadioItem>
							{availableCategories.map((category) => (
								<ContextMenuRadioItem key={category.id} value={category.id} showDot={false}>
									<div className="flex items-center gap-2 truncate">
										<span
											className="size-2 rounded-full shrink-0"
											style={{ backgroundColor: category.color ?? "#9CA3AF" }}
										/>
										<span className="truncate">{category.name}</span>
									</div>
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Release */}
				<ContextMenuSub>
					<ContextMenuSubTrigger className="gap-3 w-full">
						<IconRocket className="size-3.5" />
						Release
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-56 max-h-60 overflow-y-auto">
						<ContextMenuRadioGroup
							value={task.releaseId ?? "none"}
							onValueChange={(value) => {
								const releaseId = value === "none" ? null : value;
								execute({
									kind: "single",
									field: "release",
									updateData: { releaseId },
									optimisticTask: { ...task, releaseId },
									toastMessages: {
										loading: { title: releaseId ? "Updating release..." : "Removing release..." },
										success: { title: releaseId ? "Release updated" : "Release removed" },
										error: { title: "Failed to update release" },
									},
								});
							}}
						>
							<ContextMenuRadioItem value="none" showDot={false}>
								No release
							</ContextMenuRadioItem>
							{availableReleases.map((release) => (
								<ContextMenuRadioItem key={release.id} value={release.id} showDot={false}>
									<div className="flex items-center gap-2 truncate">
										<IconRocket className="size-3.5 shrink-0" style={{ color: release.color ?? undefined }} />
										<span className="truncate">{release.name}</span>
									</div>
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>
			</ContextMenuContent>
		</ContextMenu>
	);
}
