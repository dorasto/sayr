import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import {
	priorityConfig,
	RenderCategory,
	RenderLabel,
	statusConfig,
} from "@/components/tasks";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { cn } from "@/lib/utils";

type TaskMentionProps = {
	task: schema.TaskWithLabels;
	categories: schema.categoryType[];
};

export function TaskMention({ task, categories }: TaskMentionProps) {
	const status = task.status.replace(/"/g, "");
	const priority = task.priority.replace(/"/g, "");
	const priorityCfg = priorityConfig[priority as keyof typeof priorityConfig];
	const statusCfg = statusConfig[status as keyof typeof statusConfig];
	const statusIcon = statusCfg?.icon(cn(statusCfg?.className, "h-3.5 w-3.5"));
	const priorityIcon = priorityCfg?.icon(
		cn(priorityCfg?.className, "h-3.5 w-3.5"),
	);
	// const linkHref = `/admin/${task.organizationId}/tasks/${task.shortId}`;
	const category = categories?.find((c) => c.id === task.category);
	const shortId = String(task.shortId);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					to="/admin/$orgId/tasks/$taskShortId"
					params={{ orgId: task.organizationId, taskShortId: shortId }}
				>
					{/* Title & Short ID */}
					<InlineLabel
						className="text-sm ps-5 align-bottom shrink-0 pr-1.5 rounded-lg bg-accent text-accent-foreground"
						text={`#${shortId} ${task.title}`}
						textNode={
							<>
								<span className="text-muted-foreground! text-xs!">
									#{shortId}
								</span>
								<span className="text-sm!">
									{task.title ? ` ${task.title}` : ""}
								</span>
							</>
						}
						icon={statusIcon}
					/>
					{/* <span className="text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
						<span className="font-medium text-foreground">
							#{task.shortId ?? task.id}
						</span>
						{task.title ? ` · ${task.title}` : ""}
					</span> */}

					{/* Assignees */}
					{/* {task.assignees && task.assignees.length > 0 && (
						<div className="flex items-center -space-x-2">
							{task.assignees.slice(0, 3).map((a, index) => (
								<div key={a.id} className={cn("relative", `z-[${10 - index}]`)}>
									<Avatar
										className={cn(
											"h-5 w-5 rounded-full overflow-hidden transition-transform",
											"hover:scale-[1.05]", // tiny visual lift on hover
										)}
									>
										{a.image ? (
											<AvatarImage
												src={a.image}
												alt={a.name ?? "user"}
												className="object-cover h-full w-full m-0!"
											/>
										) : (
											<AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
												{a.name?.[0]?.toUpperCase()}
											</AvatarFallback>
										)}
									</Avatar>
								</div>
							))}

							{task.assignees.length > 3 && (
								<span className="text-[11px] text-muted-foreground font-medium ml-1">
									+{task.assignees.length - 3}
								</span>
							)}
						</div>
					)} */}
				</Link>
			</TooltipTrigger>

			{/* Tooltip for detail preview */}
			<TooltipContent
				side="top"
				align="center"
				className="max-w-xs p-0 flex flex-col gap-1 text-sm"
			>
				<Link
					to="/admin/$orgId/tasks/$taskShortId"
					params={{ orgId: task.organizationId, taskShortId: shortId }}
				>
					<div className="flex items-center gap-1 p-1">
						<Label variant={"subheading"} className="p-1 truncate">
							{task.title} asdf asodifj asoidf jasoidj foasidjf oasidjf oasidjf
							oasidj foij
						</Label>
						<Badge
							variant="outline"
							className={cn(
								"inline-flex items-center gap-1 text-xs cursor-pointer transition-colors duration-150 ml-auto shrink-0",
								statusCfg?.className,
							)}
						>
							{statusIcon}
							<span>{statusCfg?.label || status}</span>
						</Badge>
					</div>
					<Separator />
					<div className="flex flex-wrap items-center gap-1 text-muted-foreground p-1">
						{/* Priority */}
						<Badge
							variant="outline"
							className={cn(
								"inline-flex items-center gap-1 justify-start text-xs",
							)}
						>
							{priorityIcon}
							<span>{priorityCfg?.label || priority}</span>
						</Badge>
						{/* Category */}
						{task.category && category && (
							<RenderCategory category={category} />
						)}
						{/* Labels */}
						{task.labels?.length > 0 && (
							<div className="flex flex-wrap gap-1 pt-1">
								{task.labels.map((l) => (
									<RenderLabel key={l.id} label={l} />
								))}
							</div>
						)}
					</div>
				</Link>
			</TooltipContent>
		</Tooltip>
	);
}
