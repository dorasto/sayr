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
	keywords?: string; // Additional keywords for search matching (e.g., "new create add" for a "Create task" item)
	metadata?: ReactNode; // Additional metadata to display (e.g., org name badge)
};

export type CommandGroup = {
	heading: string;
	items: CommandItem[];
	priority?: number; // Lower number = appears first. Default is 50. Context-aware groups use 10.
};

export type CommandMap = Record<string, CommandGroup[]>;
