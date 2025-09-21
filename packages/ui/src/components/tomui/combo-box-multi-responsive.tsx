"use client";

import { CheckIcon } from "lucide-react";
import * as React from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../command";
import { Drawer, DrawerContent, DrawerTrigger } from "../custom-sidebar-drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

export type ComboBoxMultiItem = {
	value: string;
	label: string;
	icon?: React.ReactNode;
};

export interface ComboBoxMultiResponsiveProps {
	items: ComboBoxMultiItem[];
	placeholder?: string;
	emptyText?: string;
	buttonText?: string; // Text when nothing selected
	buttonWidth?: string;
	popoverWidth?: string;
	values?: string[]; // Controlled values
	onValuesChange?: (values: string[]) => void;
	maxVisible?: number; // How many selected pills to show before summarizing
	summaryLabel?: (count: number) => string; // i.e. (n)=>`${n} labels`
	clearOnSelectIfExists?: boolean; // If selecting an already-selected item removes it (toggle behavior)
	disabled?: boolean; // Disable interaction
}

/*
Design notes:
- Pills shown inside trigger (desktop & mobile) up to `maxVisible` (default 3). If more, show summary text from summaryLabel(count).
- Height remains stable via flex wrap off & overflow hidden; we keep a single row by using flex-row gap-1 and conditionally summarizing.
- Uncontrolled mode maintained via internal state when `values` not provided.
*/

export function ComboBoxMultiResponsive({
	items,
	placeholder = "Filter items...",
	emptyText = "No results found.",
	buttonText = "Select items",
	buttonWidth = "",
	popoverWidth = "w-[260px]",
	values,
	onValuesChange,
	maxVisible = 3,
	summaryLabel = (count) => `${count} selected`,
	clearOnSelectIfExists = true,
	disabled,
}: ComboBoxMultiResponsiveProps) {
	const [open, setOpen] = React.useState(false);
	const isDesktop = !useIsMobile();
	const [internalValues, setInternalValues] = React.useState<string[]>([]);

	const selectedValues = values ?? internalValues;
	const selectedItems = items.filter((i) => selectedValues.includes(i.value));

	const updateValues = (next: string[]) => {
		if (onValuesChange) onValuesChange(next);
		else setInternalValues(next);
	};

	const toggleValue = (val: string) => {
		let next: string[];
		if (selectedValues.includes(val)) {
			if (clearOnSelectIfExists) {
				next = selectedValues.filter((v) => v !== val);
			} else {
				next = [...selectedValues];
			}
		} else {
			next = [...selectedValues, val];
		}
		updateValues(next);
	};

	const renderSelectedVisual = () => {
		if (selectedItems.length === 0) return <>{buttonText}</>;
		if (selectedItems.length > maxVisible) {
			return (
				<Button variant={"accent"} size={"sm"}>
					{summaryLabel(selectedItems.length)}
				</Button>
			);
		}
		return (
			<div className="flex items-center gap-1">
				{selectedItems.map((item) => (
					<Button
						variant={"accent"}
						size={"sm"}
						key={item.value}
						className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-accent/40"
					>
						{item.icon && <span className="shrink-0">{item.icon}</span>}
						{item.label}
					</Button>
				))}
			</div>
		);
	};

	const list = (
		<ItemMultiList
			items={items}
			placeholder={placeholder}
			emptyText={emptyText}
			toggleValue={toggleValue}
			selectedValues={selectedValues}
		/>
	);

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild disabled={disabled}>
					<Button
						size={"sm"}
						variant="accent"
						className={`${buttonWidth} items-center gap-1 justify-start overflow-hidden`}
					>
						{renderSelectedVisual()}
					</Button>
				</PopoverTrigger>
				<PopoverContent className={`${popoverWidth} p-0`} align="start">
					{list}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button
					size={"sm"}
					variant="outline"
					className={`${buttonWidth} items-center gap-1 justify-start overflow-hidden`}
				>
					{renderSelectedVisual()}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-4 border-t">{list}</div>
			</DrawerContent>
		</Drawer>
	);
}

function ItemMultiList({
	items,
	placeholder,
	emptyText,
	toggleValue,
	selectedValues,
}: {
	items: ComboBoxMultiItem[];
	placeholder: string;
	emptyText: string;
	toggleValue: (value: string) => void;
	selectedValues: string[];
}) {
	return (
		<Command>
			<CommandInput placeholder={placeholder} />
			<CommandList>
				<CommandEmpty>{emptyText}</CommandEmpty>
				<CommandGroup>
					{items.map((item) => {
						const isSelected = selectedValues.includes(item.value);
						return (
							<CommandItem
								key={item.value}
								value={item.value}
								onSelect={(value) => {
									toggleValue(value);
									// Keep open for multi-select; user can close manually
								}}
							>
								{item.icon && <span className="mr-2 opacity-80">{item.icon}</span>}
								<span className="flex-1 text-left">{item.label}</span>
								{isSelected && (
									<span className="ml-auto text-xs font-medium">
										<CheckIcon />
									</span>
								)}
							</CommandItem>
						);
					})}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
