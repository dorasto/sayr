import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconAlertSquareFilled } from "@tabler/icons-react";

export const statusConfig = {
	backlog: {
		label: "Backlog",
		icon: (className: string) => <StatusIcon status="backlog" className={className} />,
		className: "text-muted-foreground",
		color: "#6B7280",
		var: "muted-foreground",
	},
	todo: {
		label: "Todo",
		icon: (className: string) => <StatusIcon status="todo" className={className} />,
		className: "text-foreground",
		color: "#3B82F6",
		var: "foreground",
	},
	"in-progress": {
		label: "In Progress",
		icon: (className: string) => <StatusIcon status="in-progress" className={className} />,
		className: "text-primary fill-primary",
		color: "#F59E0B",
		var: "primary",
	},
	done: {
		label: "Done",
		icon: (className: string) => <StatusIcon status="done" className={className} />,
		className: "text-success",
		color: "#10B981",
		var: "success",
	},
	canceled: {
		label: "Canceled",
		icon: (className: string) => <StatusIcon status="canceled" className={className} />,
		className: "text-desctructive",
		color: "#EF4444",
		var: "destructive",
	},
} as const;

export const priorityConfig = {
	low: {
		label: "Low",
		icon: (className: string) => <PriorityIcon bars={1} className={className} />,
		className: "text-gray-500",
		color: "#6B7280",
	},
	medium: {
		label: "Medium",
		icon: (className: string) => <PriorityIcon bars={2} className={className} />,
		className: "text-yellow-500",
		color: "#F59E0B",
	},
	high: {
		label: "High",
		icon: (className: string) => <PriorityIcon bars={3} className={className} />,
		className: "text-red-500",
		color: "#EF4444",
	},
	urgent: {
		label: "Urgent",
		icon: (className: string) => <IconAlertSquareFilled className={className} />,
		className: " text-destructive",
		color: "#DC2626",
	},
	none: {
		label: "No Priority",
		icon: (className: string) => <PriorityIcon bars="none" className={className} />,
		className: "text-gray-400",
		color: "#9CA3AF",
	},
} as const;

export type StatusKey = keyof typeof statusConfig;
export type PriorityKey = keyof typeof priorityConfig;
