import type { ReactNode } from "react";

export type CommandItem = {
	id: string;
	label: string;
	icon?: ReactNode;
	shortcut?: string;
	subId?: string; // If present, selecting this item pushes this ID to the view stack
	action?: () => void; // If present, this function is executed
	closeOnSelect?: boolean; // If true, close the dialog after selection. Defaults to true.
	show?: boolean; // If present, only show this command when these conditions are met
	value?: string; // Value for cmdk filtering
};

export type CommandGroup = {
	heading: string;
	items: CommandItem[];
};

export type CommandMap = Record<string, CommandGroup[]>;
