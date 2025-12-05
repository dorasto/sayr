"use client";

import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Switch } from "@repo/ui/components/switch";
import OptionField from "@repo/ui/components/tomui/option-field";
import { cn } from "@repo/ui/lib/utils";
import {
	IconAdjustmentsHorizontal,
	IconCheck,
	IconEyeOff,
	IconLayoutKanban,
	IconLayoutList,
	IconLayoutRows,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { TASK_GROUPING_OPTIONS, TASK_GROUPINGS } from "./config";
import type { TaskGroupingId } from "./types";
import { useTaskViewState } from "./use-task-view-state";

const VIEW_MODE_OPTIONS = [
	{ id: "list", label: "List", icon: <IconLayoutList className="h-4 w-4" /> },
	{ id: "kanban", label: "Kanban", icon: <IconLayoutKanban className="h-4 w-4" /> },
] as const;

type ViewMode = (typeof VIEW_MODE_OPTIONS)[number]["id"];

export function TaskViewDropdown() {
	const { viewState, setGrouping, setShowEmptyGroups, setShowCompletedTasks, setViewMode } = useTaskViewState();

	const activeGrouping = TASK_GROUPINGS[viewState.grouping] ?? TASK_GROUPINGS.status;

	const activeViewMode: ViewMode = viewState.viewMode;

	const groupingOptions = useMemo(() => TASK_GROUPING_OPTIONS, []);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="accent" className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1")}>
					<IconAdjustmentsHorizontal className="w-4 h-4" />
					<span className="text-xs">View</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="max-w-96 flex flex-col gap-3 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
				<RadioGroup
					defaultValue={activeViewMode}
					className="flex items-center gap-2"
					onValueChange={(v) => setViewMode(v as ViewMode)}
				>
					{VIEW_MODE_OPTIONS.map((option) => (
						<Label
							key={option.id}
							className={cn(
								"flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
								activeViewMode === option.id && "border-primary/50 bg-accent"
							)}
						>
							<RadioGroupItem value={option.id} checked={option.id === activeViewMode} className="sr-only" />
							<div className="flex items-center gap-1">
								{option.icon}
								<span className="cursor-pointer text-sm font-semibold">{option.label}</span>
							</div>
						</Label>
					))}
				</RadioGroup>
				<OptionField
					title="Group by"
					icon={<IconLayoutRows className="h-4 w-4" />}
					customSide={
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="accent" className={cn("gap-2 border-transparent p-1 h-auto")}>
									{activeGrouping.icon}
									<span className="text-xs">{activeGrouping.label}</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-64" side="bottom" align="end">
								<DropdownMenuRadioGroup
									value={viewState.grouping}
									onValueChange={(value) => setGrouping(value as TaskGroupingId)}
								>
									{groupingOptions.map((grouping) => (
										<DropdownMenuRadioItem key={grouping.id} value={grouping.id} className="pl-8">
											<span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
												{grouping.icon}
											</span>
											<span
												className={cn(
													"text-sm",
													grouping.id === viewState.grouping && "text-foreground font-medium"
												)}
											>
												{grouping.label}
											</span>
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>

								<DropdownMenuCheckboxItem
									checked={viewState.showEmptyGroups}
									onCheckedChange={(checked) => setShowEmptyGroups(Boolean(checked))}
								>
									Show empty groups
								</DropdownMenuCheckboxItem>
							</DropdownMenuContent>
						</DropdownMenu>
					}
				/>
				<OptionField
					title="Show completed tasks"
					icon={<IconCheck className="h-4 w-4" />}
					customSide={
						<Switch
							checked={viewState.showCompletedTasks}
							onCheckedChange={(checked) => setShowCompletedTasks(Boolean(checked))}
						/>
					}
				/>
				<OptionField
					title="Show empty groups"
					icon={<IconEyeOff className="h-4 w-4" />}
					customSide={
						<Switch
							checked={viewState.showEmptyGroups}
							onCheckedChange={(checked) => setShowEmptyGroups(Boolean(checked))}
						/>
					}
				/>
			</PopoverContent>
		</Popover>
	);
}
