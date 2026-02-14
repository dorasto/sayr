import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { IconUsers } from "@tabler/icons-react";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";

export interface TaskListItemProps {
	task: schema.TaskWithLabels;
	isSelected: boolean;
	onClick: () => void;
}

export function TaskListItem({ task, isSelected, onClick }: TaskListItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-col gap-1.5 p-3 text-left hover:bg-accent transition-colors rounded-lg text-muted-foreground",
				isSelected && "bg-secondary hover:bg-secondary text-foreground",
				task.priority === "urgent" &&
					"bg-destructive/10 hover:bg-destructive/20",
				isSelected &&
					task.priority === "urgent" &&
					"bg-destructive/20 hover:bg-destructive/20",
			)}
		>
			{/* Organization badge */}
			{task.organization && (
				<div className="flex items-center flex-1 gap-1">
					<InlineLabel
						className="shrink"
						icon={
							<Avatar className="h-4 w-4">
								<AvatarImage
									src={task.organization.logo || ""}
									alt={task.organization.name}
									className=""
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
						}
						text={task.organization.name}
					/>

					<span className="text-xs text-muted-foreground">#{task.shortId}</span>
					{/* meta */}
					<div className="flex items-center gap-2 text-xs ml-auto shrink-0">
						{status && (
							<div className="flex items-center gap-1">
								{status.icon(cn(status.className, "size-4"))}
							</div>
						)}
						{priority && task.priority !== "none" && (
							<div className="flex items-center gap-1">
								{priority.icon(cn(priority.className, "size-4"))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Title */}
			<p className="text-sm font-medium line-clamp-1 ps-1.5">
				{task.title || "Untitled"}
			</p>
		</button>
	);
}
