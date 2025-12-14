import { IconMessageDots } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineComment({ item, availableUsers }: TimelineItemProps) {
	return (
		<TimelineItemWrapper
			item={item}
			availableUsers={availableUsers || []}
			icon={IconMessageDots}
			color="bg-accent text-primary-foreground"
		/>
	);
}
