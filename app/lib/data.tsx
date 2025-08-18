import {
	CheckCircledIcon,
	CircleIcon,
	CrossCircledIcon,
	QuestionMarkCircledIcon,
	StopwatchIcon,
} from "@radix-ui/react-icons";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react";

export const labels = [
	{
		value: "bug",
		label: "Bug",
	},
	{
		value: "feature",
		label: "Feature",
	},
	{
		value: "documentation",
		label: "Documentation",
	},
];

export const statuses = [
	{
		value: "Backlog",
		label: "Backlog",
		icon: QuestionMarkCircledIcon,
	},
	{
		value: "Todo",
		label: "Todo",
		icon: CircleIcon,
	},
	{
		value: "In Progress",
		label: "In Progress",
		icon: StopwatchIcon,
	},
	{
		value: "Done",
		label: "Done",
		icon: CheckCircledIcon,
	},
	{
		value: "Canceled",
		label: "Canceled",
		icon: CrossCircledIcon,
	},
];

export const priorities = [
	{
		label: "Low",
		value: "Low",
		icon: ArrowDownIcon,
	},
	{
		label: "Medium",
		value: "Medium",
		icon: ArrowRightIcon,
	},
	{
		label: "High",
		value: "High",
		icon: ArrowUpIcon,
	},
];
