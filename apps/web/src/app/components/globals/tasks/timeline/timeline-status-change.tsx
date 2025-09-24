import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { statusConfig } from "../../../admin/organization/project/table/task-list-item";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineStatusChange({ item }: TimelineItemProps) {
	const renderStatusChange = () => {
		if (!item.fromValue || !item.toValue) {
			return "changed the status";
		}

		// Parse JSON strings if needed
		const from = item.fromValue as string;
		const to = item.toValue as string;

		const fromConfig = statusConfig[from.replaceAll('"', "") as keyof typeof statusConfig];
		const toConfig = statusConfig[to.replaceAll('"', "") as keyof typeof statusConfig];

		return (
			<>
				<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the status
				from{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
					<span>{fromConfig?.label || from.replaceAll('"', "")}</span>
				</Badge>{" "}
				to{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
					<span>{toConfig?.label || to.replaceAll('"', "")}</span>
				</Badge>
			</>
		);
	};

	return (
		<TimelineItemWrapper item={item} icon={IconArrowRight} color="bg-accent text-primary-foreground">
			{renderStatusChange()}
		</TimelineItemWrapper>
	);
}
