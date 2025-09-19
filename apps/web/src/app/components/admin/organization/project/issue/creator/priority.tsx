"use client";

import { type ComboBoxItem, ComboBoxResponsive } from "@repo/ui/components/tomui/combo-box-responsive";
import {
	IconAlertSquare,
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars5,
	IconCircle0,
	IconCircleDashed,
	IconDots,
} from "@tabler/icons-react";

const priorityItems: ComboBoxItem[] = [
	{
		icon: <IconAntennaBars1 />,
		value: "none",
		label: "None",
	},
	{
		icon: <IconAntennaBars2 />,
		value: "low",
		label: "Low",
	},
	{
		icon: <IconAntennaBars3 />,
		value: "medium",
		label: "Medium",
	},
	{
		icon: <IconAntennaBars5 />,
		value: "high",
		label: "High",
	},
	{
		icon: <IconAlertSquare />,
		value: "urgent",
		label: "Urgent",
	},
];

export interface PrioritySelectorProps {
	value?: string;
	onValueChange?: (value: string | null) => void;
}

export function PrioritySelector({ value, onValueChange }: PrioritySelectorProps) {
	return (
		<ComboBoxResponsive
			items={priorityItems}
			placeholder="Filter priority..."
			emptyText="No priority found."
			buttonText="Priority"
			value={value}
			onValueChange={onValueChange}
		/>
	);
}
