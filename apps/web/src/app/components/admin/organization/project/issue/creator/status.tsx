"use client";

import { type ComboBoxItem, ComboBoxResponsive } from "@repo/ui/components/tomui/combo-box-responsive";
import { IconCircle0, IconCircleDashed } from "@tabler/icons-react";

const statusItems: ComboBoxItem[] = [
	{
		icon: <IconCircleDashed />,
		value: "backlog",
		label: "Backlog",
	},
	{
		value: "todo",
		label: "Todo",
	},
	{
		value: "in progress",
		label: "In Progress",
	},
	{
		value: "done",
		label: "Done",
	},
	{
		value: "canceled",
		label: "Canceled",
	},
];

export interface StatusSelectorProps {
	value?: string;
	onValueChange?: (value: string | null) => void;
}

export function StatusSelector({ value, onValueChange }: StatusSelectorProps) {
	return (
		<ComboBoxResponsive
			items={statusItems}
			placeholder="Filter status..."
			emptyText="No status found."
			buttonText="Set status"
			value={value}
			onValueChange={onValueChange}
		/>
	);
}
