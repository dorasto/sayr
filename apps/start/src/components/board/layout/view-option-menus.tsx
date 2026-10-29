import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { IconEyeOff, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { useState } from "react";
import type { BoardGroupingOption } from "../config/grouping-options";
import type { TaskSortDirection } from "../filter/sort-config";
import type { TaskGroupingId } from "../filter/types";

// The small pill dropdowns of the board's view-options popover (layout/board-view-options.tsx), as
// controlled components so the view settings sheet (saved-views/view-settings-sheet.tsx) edits a saved
// view's draft with exactly the same controls.

const NONE_ICON = <IconEyeOff className="h-4 w-4" />;

/** "Group by": one of the board's grouping options. */
export function GroupingMenu({
	value,
	options,
	onChange,
}: {
	value: TaskGroupingId | undefined;
	options: readonly BoardGroupingOption[];
	onChange: (id: TaskGroupingId) => void;
}) {
	const [open, setOpen] = useState(false);
	const active =
		options.find((option) => option.id === value) ?? options.find((option) => option.id === "status") ?? options[0];
	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						size={"sm"}
						className={"rounded-xl h-auto p-1 px-2 justify-start border gap-1"}
						variant={open ? "secondary" : "accent"}
					>
						{active?.icon}
						<span className="text-xs">{active?.label}</span>
					</Button>
				}
			/>
			<DropdownMenuContent className="w-64" side="bottom" align="end">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(next) => {
						const option = options.find((candidate) => candidate.id === next);
						if (option) onChange(option.id);
					}}
				>
					{options.map((option) => (
						<DropdownMenuRadioItem key={option.id} value={option.id} className="pl-8">
							<span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
								{option.icon}
							</span>
							<span className={cn("text-sm", value === option.id && "font-semibold text-foreground")}>
								{option.label}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** "Sub-group by": None, or a grouping option other than the top-level `grouping`. */
export function SubGroupingMenu({
	value,
	grouping,
	options,
	onChange,
}: {
	value: TaskGroupingId | "none" | undefined;
	grouping: TaskGroupingId | undefined;
	options: readonly BoardGroupingOption[];
	onChange: (id: TaskGroupingId | "none") => void;
}) {
	const [open, setOpen] = useState(false);
	const choices = options.filter((option) => option.id !== grouping);
	const active = value && value !== "none" ? options.find((option) => option.id === value) : undefined;
	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						size={"sm"}
						className={"rounded-xl h-auto p-1 px-2 justify-start border gap-1"}
						variant={open ? "secondary" : "accent"}
					>
						{active ? active.icon : NONE_ICON}
						<span className="text-xs">{active ? active.label : "None"}</span>
					</Button>
				}
			/>
			<DropdownMenuContent className="w-64" side="bottom" align="end">
				<DropdownMenuRadioGroup
					value={value ?? "none"}
					onValueChange={(next) => {
						onChange(choices.find((candidate) => candidate.id === next)?.id ?? "none");
					}}
				>
					{[{ id: "none" as const, label: "None", icon: NONE_ICON }, ...choices].map((option) => (
						<DropdownMenuRadioItem key={option.id} value={option.id} className="pl-8">
							<span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
								{option.icon}
							</span>
							<span className={cn("text-sm", option.id === value && "text-foreground font-medium")}>
								{option.label}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** "Sort by": None or one of `fields`, plus the direction toggle while a field is picked. */
export function SortMenu<S extends string>({
	sortBy,
	sortDirection,
	fields,
	onSortByChange,
	onSortDirectionChange,
}: {
	sortBy: S | "none" | undefined;
	sortDirection: TaskSortDirection | undefined;
	fields: readonly { id: S; label: string }[];
	onSortByChange: (sortBy: S | "none") => void;
	onSortDirectionChange: (direction: TaskSortDirection) => void;
}) {
	const [open, setOpen] = useState(false);
	const active = sortBy && sortBy !== "none" ? fields.find((field) => field.id === sortBy) : undefined;
	return (
		<div className="flex items-center gap-1">
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger
					render={
						<Button
							size={"sm"}
							className={"rounded-xl h-auto p-1 px-2 justify-start border gap-1"}
							variant={open ? "secondary" : "accent"}
						>
							<span className="text-xs">{active ? active.label : "None"}</span>
						</Button>
					}
				/>
				<DropdownMenuContent className="w-64" side="bottom" align="end">
					<DropdownMenuRadioGroup
						value={sortBy ?? "none"}
						onValueChange={(next) => {
							onSortByChange(fields.find((field) => field.id === next)?.id ?? "none");
						}}
					>
						<DropdownMenuRadioItem value="none" className="pl-8">
							<span className="mr-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
								{NONE_ICON}
							</span>
							<span className={cn("text-sm", (sortBy ?? "none") === "none" && "font-semibold text-foreground")}>
								None
							</span>
						</DropdownMenuRadioItem>
						{fields.map((option) => (
							<DropdownMenuRadioItem key={option.id} value={option.id} className="pl-8">
								<span className={cn("text-sm", sortBy === option.id && "font-semibold text-foreground")}>
									{option.label}
								</span>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			{sortBy && sortBy !== "none" && (
				<Button
					type="button"
					variant="accent"
					size="icon"
					className="border-transparent size-7"
					aria-label={sortDirection === "desc" ? "Sort direction: descending" : "Sort direction: ascending"}
					title={sortDirection === "desc" ? "Descending" : "Ascending"}
					onClick={() => onSortDirectionChange(sortDirection === "desc" ? "asc" : "desc")}
				>
					{sortDirection === "desc" ? (
						<IconSortDescending className="h-4 w-4" />
					) : (
						<IconSortAscending className="h-4 w-4" />
					)}
				</Button>
			)}
		</div>
	);
}
