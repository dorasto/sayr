"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
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
import { cn } from "@repo/ui/lib/utils";
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { XIcon } from "lucide-react";

interface GlobalTaskAssigneesProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	availableUsers?: schema.userType[];
	onAssigneesChange?: (userIds: string[]) => void;
}

export default function GlobalTaskAssignees({
	task,
	editable = false,
	availableUsers = [],
	onAssigneesChange,
}: GlobalTaskAssigneesProps) {
	// Get current selected assignee IDs
	const currentAssigneeIds = task.assignees?.map((assignee) => assignee.id) || [];
	const handleAssigneesChange = (values: string[]) => {
		if (onAssigneesChange) {
			onAssigneesChange(values);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Assigned</Label>
			<div className="flex flex-col gap-2">
				{task.assignees.map((assignee) => (
					<RenderAssignee
						key={assignee.id}
						assignee={assignee}
						showRemove={editable}
						onRemove={(assigneeId) => {
							handleAssigneesChange(currentAssigneeIds.filter((id) => id !== assigneeId));
						}}
					/>
				))}
				<ComboBox values={currentAssigneeIds} onValuesChange={handleAssigneesChange}>
					{currentAssigneeIds.length === 0 ? (
						<ComboBoxTrigger disabled={!editable} className="">
							<ComboBoxValue placeholder="Status">
								<div className="flex items-center gap-2">
									{/* {statusConfig[currentStatus as keyof typeof statusConfig]?.icon(
										cn(statusConfig[currentStatus as keyof typeof statusConfig]?.className, "h-4 w-4")
									)} */}
									<IconUserPlus className="h-4 w-4" />
									<span>Unassigned</span>
								</div>
							</ComboBoxValue>
							<ComboBoxIcon />
						</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className="h-6 w-6 aspect-square p-0 justify-center">
							<IconPlus size={14} />
						</ComboBoxTrigger>
					)}

					<ComboBoxContent className="">
						<ComboBoxList>
							<ComboBoxSearch placeholder="Assign to..." />
							<ComboBoxEmpty>No users found.</ComboBoxEmpty>
							<ComboBoxGroup>
								{availableUsers.map((user) => (
									<ComboBoxItem key={user.id} value={user.id}>
										<Avatar className="h-6 w-6">
											<AvatarImage src={user.image || undefined} alt={user.name} />
											<AvatarFallback className="text-xs">
												{user.name
													.split(" ")
													.map((n: string) => n[0])
													.join("")
													.toUpperCase()
													.slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-sm font-medium">{user.name}</span>
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

interface RenderAssigneeProps {
	assignee: schema.userType;
	showRemove?: boolean;
	onRemove?: (assigneeId: string) => void;
	onClick?: (e: React.MouseEvent, assigneeId: string) => void;
	className?: string;
}

export function RenderAssignee({
	assignee,
	showRemove = false,
	onRemove,
	onClick,
	className = "",
}: RenderAssigneeProps) {
	return (
		<Button
			key={assignee.id}
			variant="accent"
			className={cn(
				"justify-start group/assignee relative h-auto py-1 bg-transparent border-transparent px-1",
				showRemove && "pr-6",
				className
			)}
			onClick={onClick ? (e) => onClick(e, assignee.id) : undefined}
		>
			<Avatar className="h-6 w-6">
				<AvatarImage src={assignee.image || undefined} alt={assignee.name} />
				<AvatarFallback className="text-xs">
					{assignee.name
						.split(" ")
						.map((n) => n[0])
						.join("")
						.toUpperCase()
						.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<span className="truncate">{assignee.name}</span>
			{showRemove && onRemove && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pr-1">
					<XIcon
						size={12}
						className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/assignee:opacity-100"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(assignee.id);
						}}
					/>
				</div>
			)}
		</Button>
	);
}
