"use client";

import { type ComboBoxItem, ComboBoxResponsive } from "@repo/ui/components/tomui/combo-box-responsive";
import { IconCircleDashed } from "@tabler/icons-react";

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
		value: "in-progress",
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
	value?: string | null;
	onValueChange?: (value: string | null) => void;
}

export function StatusSelector({ value, onValueChange }: StatusSelectorProps) {
	return (
		<ComboBoxResponsive
			items={statusItems}
			placeholder="Filter status..."
			emptyText="No status found."
			buttonText="Status"
			value={value || ""}
			onValueChange={onValueChange}
		/>
	);
}
