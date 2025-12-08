import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { priorityConfig } from "../../shared/config";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelinePriorityChange({ item }: TimelineItemProps) {
	// Parse the 'to' value to get the priority config for the icon
	const to = (item.toValue as string)?.replaceAll('"', "");
	const toConfig = priorityConfig[to as keyof typeof priorityConfig];

	// Create a wrapper component that adapts the icon function to accept size prop
	const PriorityIcon = toConfig?.icon
		? () => toConfig.icon(cn(toConfig.className, `h-4 w-4`, to !== "urgent" && "fill-foreground"))
		: IconArrowRight;

	const renderPriorityChange = () => {
		if (!item.fromValue || !item.toValue) {
			return "changed the priority";
		}

		// Parse JSON strings if needed
		const from = item.fromValue as string;

		const fromConfig = priorityConfig[from.replaceAll('"', "") as keyof typeof priorityConfig];

		return (
			<>
				<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the priority
				from{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{fromConfig?.icon(cn(fromConfig.className, "h-3 w-3"))}
					<span>{fromConfig?.label || from.replaceAll('"', "")}</span>
				</Badge>{" "}
				to{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{toConfig?.icon(cn(toConfig.className, "h-3 w-3"))}
					<span>{toConfig?.label || to.replaceAll('"', "")}</span>
				</Badge>
			</>
		);
	};

	return (
		<TimelineItemWrapper item={item} icon={PriorityIcon} color="bg-accent text-primary-foreground">
			{renderPriorityChange()}
		</TimelineItemWrapper>
	);
}
