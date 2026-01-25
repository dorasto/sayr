"use client";

import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { TaskStatusChart, TaskPriorityBar, TaskAssigneeChart, SimpleRadialChart } from "@/components/charts";
import { IconChartPie, IconChartBar, IconUsers, IconCheckbox } from "@tabler/icons-react";
import type { schema } from "@repo/database";

interface ReleaseSidebarProps {
	tasks: schema.TaskWithLabels[];
	taskStats: {
		total: number;
		completed: number;
		inProgress: number;
		todo: number;
		backlog: number;
		completionPercentage: number;
	};
	daysUntilTarget: number | null;
}

export function ReleaseSidebar({ tasks, taskStats, daysUntilTarget }: ReleaseSidebarProps) {
	if (taskStats.total === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-8">
				<IconCheckbox className="w-12 h-12 text-muted-foreground mb-4" />
				<h3 className="text-lg font-medium mb-2">No tasks yet</h3>
				<p className="text-sm text-muted-foreground">Tasks assigned to this release will appear in the charts.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Release Progress Card */}
			<Tile className="md:w-full flex-col items-start gap-3">
				<TileHeader className="w-full">
					<TileIcon>
						<IconCheckbox />
					</TileIcon>
					<TileTitle>Release Progress</TileTitle>
				</TileHeader>
				<div className="w-full flex flex-col gap-2">
					<SimpleRadialChart
						value={taskStats.completionPercentage}
						label="Tasks Completed"
						formatValue={() => `${taskStats.completed}/${taskStats.total}`}
					/>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="flex flex-col">
							<span className="text-muted-foreground">Completed</span>
							<span className="font-medium">{taskStats.completed}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">In Progress</span>
							<span className="font-medium">{taskStats.inProgress}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">To Do</span>
							<span className="font-medium">{taskStats.todo}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Backlog</span>
							<span className="font-medium">{taskStats.backlog}</span>
						</div>
					</div>
					{daysUntilTarget !== null && (
						<div className="pt-2 border-t">
							<div className="flex flex-col">
								<span className="text-muted-foreground text-xs">Target Date</span>
								<span className="font-medium text-sm">
									{daysUntilTarget > 0
										? `${daysUntilTarget} days remaining`
										: daysUntilTarget === 0
											? "Due today"
											: `${Math.abs(daysUntilTarget)} days overdue`}
								</span>
							</div>
						</div>
					)}
				</div>
			</Tile>

			{/* Task Status Distribution */}
			<Tile className="md:w-full flex-col items-start gap-3">
				<TileHeader className="w-full">
					<TileIcon>
						<IconChartPie />
					</TileIcon>
					<TileTitle>Status Distribution</TileTitle>
					<TileDescription>Task breakdown by status</TileDescription>
				</TileHeader>
				<TaskStatusChart tasks={tasks} />
			</Tile>

			{/* Task Priority Distribution */}
			<Tile className="md:w-full flex-col items-start gap-3">
				<TileHeader className="w-full">
					<TileIcon>
						<IconChartBar />
					</TileIcon>
					<TileTitle>Priority Distribution</TileTitle>
					<TileDescription>Task breakdown by priority</TileDescription>
				</TileHeader>
				<TaskPriorityBar tasks={tasks} />
			</Tile>

			{/* Task Assignee Distribution */}
			<Tile className="md:w-full flex-col items-start gap-3">
				<TileHeader className="w-full">
					<TileIcon>
						<IconUsers />
					</TileIcon>
					<TileTitle>Assignee Workload</TileTitle>
					<TileDescription>Tasks assigned per team member</TileDescription>
				</TileHeader>
				<TaskAssigneeChart tasks={tasks} />
			</Tile>
		</div>
	);
}
