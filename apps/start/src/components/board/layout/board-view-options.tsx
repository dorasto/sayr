import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Switch } from "@repo/ui/components/switch";
import OptionField from "@repo/ui/components/tomui/option-field";
import { cn } from "@repo/ui/lib/utils";
import { IconAdjustmentsHorizontal, IconArrowsSort, IconCheck, IconLayoutRows } from "@tabler/icons-react";
import { useState } from "react";
import { useBoardGroupingOptions } from "../config/grouping-options";
import { useBoardEntity } from "../core/board-data";
import { isPersistedViewMode } from "../core/view-config";
import { useBoardViewState } from "../filter/use-board-view-state";
import { useActiveBoardView, useBoardViews } from "../views/view-registry";
import { getViewOptionVisibility } from "../views/view-registry-model";
import { GroupingMenu, SortMenu, SubGroupingMenu } from "./view-option-menus";

/**
 * Board's view-options popover (view mode, group by, sub-group by, sort by +
 * direction, show completed toggle), driven by useBoardViewState() and the
 * board's own grouping options/TASK_SORT_FIELDS.
 */
export function BoardViewOptions() {
	const {
		grouping,
		subGrouping,
		showCompletedTasks,
		sortBy,
		sortDirection,
		setGrouping,
		setSubGrouping,
		setShowCompletedTasks,
		setViewMode,
		setSortBy,
		setSortDirection,
	} = useBoardViewState();

	// The entity's menus: grouping/sort options and the completed toggle's label.
	const { sortFields, completedToggleLabel } = useBoardEntity();
	// Without "org" on a single-org board.
	const groupingOptions = useBoardGroupingOptions();

	// The views the page registered (icon + label come from the registry) and which of the controls
	// below the active one supports.
	const views = useBoardViews();
	const activeView = useActiveBoardView();
	const { showViewPicker, showGrouping, showSubGrouping, showSort } = getViewOptionVisibility(views, activeView);

	// Only persistable view ids can be stored in the view state (a page-local view id never is).
	const selectView = (id: string) => {
		if (isPersistedViewMode(id)) setViewMode(id);
	};

	const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
	return (
		<Popover open={isViewOptionsOpen} onOpenChange={setIsViewOptionsOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant={isViewOptionsOpen ? "secondary" : "ghost"}
						size={"sm"}
						className={cn("gap-2 h-6 w-6 p-1")}
					>
						<IconAdjustmentsHorizontal className="w-4 h-4" />
						{/*<span className="text-xs">View</span>*/}
					</Button>
				}
			/>
			<PopoverContent className="max-w-96 flex flex-col gap-3" initialFocus={false} align="end">
				{showViewPicker && (
					<RadioGroup
						value={activeView.id}
						className="flex items-center gap-2"
						onValueChange={(value) => {
							if (typeof value === "string") selectView(value);
						}}
					>
						{views.map((option) => (
							<Button
								key={option.id}
								variant={activeView.id === option.id ? "secondary" : "ghost"}
								onClick={() => selectView(option.id)}
								size={"sm"}
								className={"rounded-xl h-auto py-1 justify-start"}
							>
								{/*<Label
                key={option.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  activeViewMode === option.id && "border-primary/50 bg-accent",
                )}
              >
                <RadioGroupItem value={option.id} className="sr-only" />
                <div className="flex items-center gap-1">
                  {option.icon}
                  <span className="cursor-pointer text-sm font-semibold">
                    {option.label}
                  </span>
                </div>
              </Label>*/}
								<RadioGroupItem value={option.id} className="sr-only" />
								{option.icon} {option.label}
							</Button>
						))}
					</RadioGroup>
				)}
				{showGrouping && (
					<OptionField
						title="Group by"
						titleClassName="text-xs text-muted-foreground"
						titleWrapper="gap-1"
						icon={<IconLayoutRows className="size-3" />}
						customSide={<GroupingMenu value={grouping} options={groupingOptions} onChange={setGrouping} />}
					/>
				)}
				{showSubGrouping && (
					<OptionField
						title="Sub-grouping"
						titleClassName="text-xs text-muted-foreground"
						titleWrapper="gap-1"
						icon={<IconLayoutRows className="size-3" />}
						customSide={
							<SubGroupingMenu
								value={subGrouping}
								grouping={grouping}
								options={groupingOptions}
								onChange={setSubGrouping}
							/>
						}
					/>
				)}
				{showSort && (
					<OptionField
						title="Sort by"
						titleClassName="text-xs text-muted-foreground"
						titleWrapper="gap-1"
						icon={<IconArrowsSort className="size-3 text-muted-foreground" />}
						customSide={
							<SortMenu
								sortBy={sortBy}
								sortDirection={sortDirection}
								fields={sortFields}
								onSortByChange={setSortBy}
								onSortDirectionChange={setSortDirection}
							/>
						}
					/>
				)}
				<OptionField
					title={completedToggleLabel}
					titleClassName="text-xs text-muted-foreground"
					titleWrapper="gap-1"
					icon={<IconCheck className="size-3" />}
					customSide={
						<Switch
							checked={showCompletedTasks}
							onCheckedChange={(checked) => setShowCompletedTasks(Boolean(checked))}
						/>
					}
				/>
			</PopoverContent>
		</Popover>
	);
}
