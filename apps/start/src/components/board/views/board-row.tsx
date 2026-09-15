import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { OrgHoverCard } from "@/components/hover-cards";
import { FieldAssignee } from "../fields/field-assignee";
import { FieldPriority } from "../fields/field-priority";
import { FieldStatus } from "../fields/field-status";
import { ORG_KEY_SLOT_CLASS } from "./group-header";

interface BoardRowProps {
	task: schema.TaskWithLabels;
}

/**
 * A single list row — flat, dense, no card/border treatment (matches the
 * existing UnifiedTaskItem list row, not a boxed item). Priority + task key
 * + status are clustered on the left so the icons read as directly attached
 * to the identifier, title follows, assignees sit on the right. Always a
 * real link to the task's own org detail page (org is explicit per row from
 * task.organizationId); no cross-org task detail surface is needed.
 */
export function BoardRow({ task }: BoardRowProps) {
	const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
			e.preventDefault();
		}
	};

	return (
		<Link
			to="/$orgId/tasks/$taskShortId"
			params={{ orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() }}
			onClick={handleLinkClick}
			className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-accent transition-colors rounded-xl"
		>
			<FieldPriority task={task} />
			{task.organization ? (
				<OrgHoverCard organization={task.organization}>
					<span className={cn("flex items-center gap-1 shrink-0", ORG_KEY_SLOT_CLASS)}>
						<Avatar className="size-3.5 rounded-sm shrink-0">
							<AvatarImage src={task.organization.logo ?? undefined} alt={task.organization.name} />
							<AvatarFallback className="rounded-sm text-[7px]">
								{getInitials(task.organization.name)}
							</AvatarFallback>
						</Avatar>
						<span className="truncate text-xs font-medium text-muted-foreground">
							{formatTaskKey(task.organization.shortId, task.shortId)}
						</span>
					</span>
				</OrgHoverCard>
			) : (
				<span className={cn("shrink-0 text-xs font-medium text-muted-foreground truncate", ORG_KEY_SLOT_CLASS)}>
					{task.shortId}
				</span>
			)}
			<FieldStatus task={task} />
			<span
				className={cn(
					"truncate text-sm text-foreground flex-1 min-w-0 flex items-center",
					(task.status === "done" || task.status === "canceled") && "text-muted-foreground"
				)}
			>
				{task.visible === "private" && <IconLock className="size-3.5 mr-1 text-primary shrink-0" />}
				{task.title || "Untitled"}
			</span>
			<div className="shrink-0">
				<FieldAssignee task={task} />
			</div>
		</Link>
	);
}
