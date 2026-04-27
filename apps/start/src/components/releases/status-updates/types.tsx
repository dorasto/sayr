import { IconAlertTriangle, IconCircleCheck, IconX } from "@tabler/icons-react";

export type Health = "on_track" | "at_risk" | "off_track";
export type Visibility = "public" | "internal";

export const healthConfig: Record<
	Health,
	{
		label: string;
		icon: React.ReactNode;
		className: string;
		cardClassName?: string;
	}
> = {
	on_track: {
		label: "On track",
		icon: <IconCircleCheck size={14} />,
		className: "bg-success/10 text-success border-success/30",
		cardClassName: "border-success/30 bg-success/5",
	},
	at_risk: {
		label: "At risk",
		icon: <IconAlertTriangle size={14} />,
		className: "bg-primary/10 text-primary border-primary/30",
		cardClassName: "border-primary/30 bg-primary/5",
	},
	off_track: {
		label: "Off track",
		icon: <IconX size={14} />,
		className: "bg-destructive/10 text-destructive border-destructive/30",
		cardClassName: "border-destructive/30 bg-destructive/5",
	},
};
