"use client";

import * as React from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../command";
import { Drawer, DrawerContent, DrawerTrigger } from "../custom-sidebar-drawer";
import { Label } from "../label";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

export type ComboBoxItem = {
	value: string;
	label: string;
	icon?: React.ReactNode;
};

export interface ComboBoxResponsiveProps {
	items: ComboBoxItem[];
	placeholder?: string;
	emptyText?: string;
	buttonText?: string;
	buttonWidth?: string;
	popoverWidth?: string;
	value?: string;
	onValueChange?: (value: string | null) => void;
}

export function ComboBoxResponsive({
	items,
	placeholder = "Filter items...",
	emptyText = "No results found.",
	buttonText = "Select item",
	buttonWidth = "",
	popoverWidth = "w-[200px]",
	value,
	onValueChange,
}: ComboBoxResponsiveProps) {
	const [open, setOpen] = React.useState(false);
	const isDesktop = !useIsMobile();
	const [internalValue, setInternalValue] = React.useState<string | null>(null);

	const selectedValue = value ?? internalValue;
	const selectedItem = items.find((item) => item.value === selectedValue);

	const handleValueChange = (newValue: string | null) => {
		if (onValueChange) {
			onValueChange(newValue);
		} else {
			setInternalValue(newValue);
		}
	};

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button size={"sm"} variant="accent" className={`${buttonWidth}  items-center gap-1 justify-start`}>
						{selectedItem ? (
							<>
								<span>{selectedItem.icon}</span>
								<Label variant={"default"}>{selectedItem.label}</Label>
							</>
						) : (
							<>{buttonText}</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className={`${popoverWidth} p-0`} align="start">
					<ItemList
						items={items}
						placeholder={placeholder}
						emptyText={emptyText}
						setOpen={setOpen}
						onValueChange={handleValueChange}
					/>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button size={"sm"} variant="outline" className={`${buttonWidth}  items-center gap-1`}>
					{selectedItem ? (
						<>
							<span className="">{selectedItem.icon}</span>
							{selectedItem.label}
						</>
					) : (
						<>{buttonText}</>
					)}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-4 border-t">
					<ItemList
						items={items}
						placeholder={placeholder}
						emptyText={emptyText}
						setOpen={setOpen}
						onValueChange={handleValueChange}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function ItemList({
	items,
	placeholder,
	emptyText,
	setOpen,
	onValueChange,
}: {
	items: ComboBoxItem[];
	placeholder: string;
	emptyText: string;
	setOpen: (open: boolean) => void;
	onValueChange: (value: string | null) => void;
}) {
	return (
		<Command>
			<CommandInput placeholder={placeholder} />
			<CommandList>
				<CommandEmpty>{emptyText}</CommandEmpty>
				<CommandGroup>
					{items.map((item) => (
						<CommandItem
							key={item.value}
							value={item.value}
							onSelect={(value) => {
								onValueChange(value);
								setOpen(false);
							}}
						>
							{item.icon && <span className="">{item.icon}</span>}
							{item.label}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
