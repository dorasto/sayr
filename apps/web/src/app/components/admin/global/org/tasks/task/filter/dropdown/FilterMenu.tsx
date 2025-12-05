"use client";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { IconFilter2, IconSearch, IconX } from "@tabler/icons-react";
import type { FilterField, FilterFieldConfig, FilterOperator } from "../types";

interface FilterMenuProps {
	activeFiltersCount: number;
	filteredConfigs: FilterFieldConfig[];
	mainSearch: string;
	setMainSearch: (v: string) => void;
	subSearch: string;
	setSubSearch: (v: string) => void;
	clearFilters: () => void;
	handleFilterAdd: (field: string, operator: FilterOperator, value: string) => void;
	getAvailableOptions: (
		field: FilterField
	) => { value: string; label: string; icon?: React.ReactNode; color?: string; image?: string }[];
}

export function FilterMenu(props: FilterMenuProps) {
	const {
		activeFiltersCount,
		filteredConfigs,
		mainSearch,
		setMainSearch,
		subSearch,
		setSubSearch,
		clearFilters,
		handleFilterAdd,
		getAvailableOptions,
	} = props;

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					setMainSearch("");
					setSubSearch("");
				}
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button variant="primary" className={cn("gap-2 h-6 w-fit p-1", activeFiltersCount > 0 && "w-6")}>
					<IconFilter2 className="w-4 h-4" />
					{activeFiltersCount <= 0 && <span className="text-xs">Filter</span>}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
				{/* Search */}
				<div className="relative">
					<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search filters..."
						value={mainSearch}
						onChange={(e) => setMainSearch(e.target.value)}
						className="pl-8 h-8 bg-transparent"
						variant={"ghost"}
					/>
				</div>
				<DropdownMenuSeparator />
				{activeFiltersCount > 0 && (
					<>
						<DropdownMenuItem onClick={clearFilters} className="text-destructive">
							<IconX className="w-4 h-4 mr-2" />
							Clear all filters
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				{Object.entries(
					filteredConfigs.reduce(
						(acc, config) => {
							const category = "Filters";
							if (!acc[category]) acc[category] = [];
							acc[category].push(config);
							return acc;
						},
						{} as Record<string, FilterFieldConfig[]>
					)
				).map(([category, configs]) => (
					<div key={category}>
						<DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
							{category}
						</DropdownMenuLabel>
						{configs.map((config) => (
							<DropdownMenuSub key={config.field}>
								<DropdownMenuSubTrigger className="flex items-center gap-2">
									{config.icon}
									<span>{config.label}</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="w-56 max-h-80 overflow-y-auto">
									<div className="relative">
										<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder={`Search ${config.label.toLowerCase()}...`}
											value={subSearch}
											onChange={(e) => setSubSearch(e.target.value)}
											className="pl-8 h-8 bg-transparent"
											variant={"ghost"}
										/>
									</div>
									<DropdownMenuSeparator />
									{getAvailableOptions(config.field).map((item, idx) => (
										<DropdownMenuItem
											key={`${item.value}-${idx}`}
											className="flex items-center gap-2 cursor-pointer"
											onClick={() => handleFilterAdd(config.field, config.filterDefault, item.value)}
										>
											{item.icon && <div className="w-3 h-3">{item.icon}</div>}
											{item.color && !item.icon && (
												<div
													className="w-3 h-3 rounded-full shrink-0"
													style={{ backgroundColor: item.color || "#gray" }}
												/>
											)}
											<span className="truncate">{item.label}</span>
										</DropdownMenuItem>
									))}
									{config.empty && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="cursor-pointer text-muted-foreground"
												onClick={() => handleFilterAdd(config.field, "empty", "")}
											>
												<span>{config.empty}</span>
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						))}
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
