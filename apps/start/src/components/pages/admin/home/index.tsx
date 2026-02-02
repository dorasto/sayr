import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import {
	Tile,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconListCheck } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { SubWrapper } from "@/components/generic/wrapper";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { useMyTasks } from "@/contexts/ContextMine";

// Priority order for sorting tasks
const priorityOrder: Record<string, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4,
};

export default function AdminHomePage() {
	const { account, organizations } = useLayoutData();
	const { tasks } = useMyTasks();

	// Filter open tasks
	const openTasks = tasks.filter(
		(t) => t.status !== "done" && t.status !== "canceled"
	);

	// Get priority tasks (sorted by priority then date, top 8)
	const priorityTasks = [...openTasks]
		.sort((a, b) => {
			const priorityDiff =
				(priorityOrder[a.priority || "none"] ?? 4) -
				(priorityOrder[b.priority || "none"] ?? 4);
			if (priorityDiff !== 0) return priorityDiff;
			return (
				new Date(b.createdAt || 0).getTime() -
				new Date(a.createdAt || 0).getTime()
			);
		})
		.slice(0, 8);

	// Calculate stats
	const urgentCount = openTasks.filter(
		(t) => t.priority === "urgent" || t.priority === "high"
	).length;
	const inProgressCount = openTasks.filter(
		(t) => t.status === "in-progress"
	).length;

	return (
		<SubWrapper
			title={`Welcome, ${account.name?.split(" ")[0] || "there"}`}
			description={`You have ${openTasks.length} open task${openTasks.length !== 1 ? "s" : ""} across ${organizations.length} organization${organizations.length !== 1 ? "s" : ""}`}
			icon={
				<Avatar className="rounded-lg">
					<AvatarImage src={account.image || ""} alt={account.name || ""} />
					<AvatarFallback className="rounded-lg">
						{account.name?.charAt(0) || "?"}
					</AvatarFallback>
				</Avatar>
			}
		>
			{/* Quick Stats Row */}
			{openTasks.length > 0 && (
				<div className="flex gap-4 flex-wrap text-sm">
					{urgentCount > 0 && (
						<div className="flex items-center gap-2 text-destructive">
							{priorityConfig.urgent.icon("size-4")}
							<span>{urgentCount} urgent/high priority</span>
						</div>
					)}
					{inProgressCount > 0 && (
						<div className="flex items-center gap-2 text-primary">
							{statusConfig["in-progress"].icon("size-4")}
							<span>{inProgressCount} in progress</span>
						</div>
					)}
				</div>
			)}

			{/* Organizations Quick Access */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<Label variant="heading" className="text-base">
						Your Organizations
					</Label>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{organizations.map((org) => {
						const orgTaskCount = tasks.filter(
							(t) =>
								t.organizationId === org.id &&
								t.status !== "done" &&
								t.status !== "canceled"
						).length;
						return (
							<Link
								key={org.id}
								to="/$orgId"
								params={{ orgId: org.id }}
								className="w-full"
							>
								<Tile className="hover:bg-accent md:w-full transition-colors h-full">
									<TileHeader className="w-full">
										<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
											<Avatar className="h-8 w-8">
												<AvatarImage src={org.logo || ""} alt={org.name} />
												<AvatarFallback className="text-xs">
													{org.name.charAt(0)}
												</AvatarFallback>
											</Avatar>
										</TileIcon>
										<div className="flex-1 min-w-0">
											<TileTitle className="font-medium truncate">
												{org.name}
											</TileTitle>
											<TileDescription className="text-xs">
												{orgTaskCount} open task{orgTaskCount !== 1 ? "s" : ""}
											</TileDescription>
										</div>
									</TileHeader>
									<IconChevronRight className="size-4 text-muted-foreground shrink-0" />
								</Tile>
							</Link>
						);
					})}
				</div>
			</section>

			{/* Priority Tasks Section */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<Label variant="heading" className="text-base">
						Priority Tasks
					</Label>
					<Link
						to="/mine"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
					>
						View all
						<IconChevronRight className="size-4" />
					</Link>
				</div>

				{priorityTasks.length > 0 ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{priorityTasks.map((task) => (
							<PriorityTaskItem key={task.id} task={task} />
						))}
					</div>
				) : (
					<Tile className="flex items-center justify-center py-8">
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<IconListCheck className="size-8" />
							<p className="text-sm">No open tasks assigned to you</p>
							<p className="text-xs">Tasks assigned to you will appear here</p>
						</div>
					</Tile>
				)}
			</section>
		</SubWrapper>
	);
}

interface PriorityTaskItemProps {
	task: schema.TaskWithLabels;
}

function PriorityTaskItem({ task }: PriorityTaskItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

	return (
		<Link
			to="/$orgId/tasks/$taskShortId"
			params={{
				orgId: task.organizationId,
				taskShortId: task.shortId?.toString() || task.id,
			}}
		>
			<div
				className={cn(
					"flex flex-col gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent transition-colors",
					task.priority === "urgent" &&
						"border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
				)}
			>
				{/* Header row: Org + Task ID + Status/Priority */}
				<div className="flex items-center gap-2">
					{task.organization && (
						<InlineLabel
							className="shrink text-xs"
							icon={
								<Avatar className="h-4 w-4">
									<AvatarImage
										src={task.organization.logo || ""}
										alt={task.organization.name}
									/>
									<AvatarFallback className="text-[10px]">
										{task.organization.name.charAt(0)}
									</AvatarFallback>
								</Avatar>
							}
							text={task.organization.name}
						/>
					)}
					<span className="text-xs text-muted-foreground">#{task.shortId}</span>

					{/* Status & Priority icons */}
					<div className="flex items-center gap-1.5 ml-auto shrink-0">
						{status && (
							<span title={status.label}>
								{status.icon(cn(status.className, "size-4"))}
							</span>
						)}
						{priority && task.priority !== "none" && (
							<span title={priority.label}>
								{priority.icon(cn(priority.className, "size-4"))}
							</span>
						)}
					</div>
				</div>

				{/* Task title */}
				<p className="text-sm font-medium line-clamp-1">
					{task.title || "Untitled"}
				</p>
			</div>
		</Link>
	);
}
