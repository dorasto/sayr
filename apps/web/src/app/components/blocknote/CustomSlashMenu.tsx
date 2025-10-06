"use client";

import type { DefaultReactSuggestionItem, SuggestionMenuProps } from "@blocknote/react";
import { Badge } from "@repo/ui/components/badge";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";

/**
 * Define the order of groups to display
 */
const GROUP_ORDER = ["Headings", "Text", "Lists", "Media", "Advanced", "Other"];

/**
 * Custom Slash Menu component using reusable UI components
 * This replaces the default BlockNote slash menu with a styled version
 */
export function CustomSlashMenu(props: SuggestionMenuProps<DefaultReactSuggestionItem>) {
	// Group items by their group property
	const groupedItems = props.items.reduce(
		(acc, item) => {
			const group = item.group || "Other";
			if (!acc[group]) {
				acc[group] = [];
			}
			acc[group].push(item);
			return acc;
		},
		{} as Record<string, DefaultReactSuggestionItem[]>
	);

	// Sort groups according to GROUP_ORDER
	const groups = Object.keys(groupedItems).sort((a, b) => {
		const indexA = GROUP_ORDER.indexOf(a);
		const indexB = GROUP_ORDER.indexOf(b);

		// If both are in GROUP_ORDER, sort by their order
		if (indexA !== -1 && indexB !== -1) {
			return indexA - indexB;
		}
		// If only a is in GROUP_ORDER, it comes first
		if (indexA !== -1) return -1;
		// If only b is in GROUP_ORDER, it comes first
		if (indexB !== -1) return 1;
		// If neither is in GROUP_ORDER, maintain alphabetical order
		return a.localeCompare(b);
	});

	return (
		<div
			className={cn(
				"flex flex-col gap-1 w-64 rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
			)}
			data-slash-menu
		>
			<div className="max-h-96 overflow-y-auto overflow-x-hidden p-2">
				{groups.map((groupName, groupIndex) => (
					<div key={groupName}>
						{groupIndex > 0 && <Separator className="my-1" />}

						{/* Group items */}
						<div className="flex flex-col gap-0.5">
							{groupedItems[groupName]?.map((item) => {
								const globalIndex = props.items.indexOf(item);
								const isSelected = props.selectedIndex === globalIndex;

								return (
									<button
										key={item.title}
										type="button"
										className={cn(
											"relative flex w-full cursor-default select-none items-center gap-3 rounded-sm px-2 py-2 text-sm outline-none transition-colors",
											"hover:bg-accent hover:text-accent-foreground",
											"focus:bg-accent focus:text-accent-foreground",
											isSelected && "bg-accent text-accent-foreground"
										)}
										onClick={() => {
											props.onItemClick?.(item);
										}}
										onMouseEnter={() => {
											// Update selected index on hover
											if (props.selectedIndex !== globalIndex) {
												// This is handled by BlockNote internally
											}
										}}
									>
										{/* Icon */}
										{item.icon && (
											<span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
												{item.icon}
											</span>
										)}

										{/* Content */}
										<div className="flex flex-1 flex-col items-start gap-0.5 w-full">
											<div className="flex items-center w-full gap-2">
												<span className="font-medium">{item.title}</span>
												{item.badge && (
													<Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal ml-auto">
														{item.badge}
													</Badge>
												)}
											</div>
											{/* {item.subtext && <span className="text-xs text-muted-foreground">{item.subtext}</span>} */}
										</div>
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Empty state */}
			{props.items.length === 0 && (
				<div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
			)}
		</div>
	);
}
