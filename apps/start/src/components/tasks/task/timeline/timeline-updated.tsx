import { IconEdit } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineUpdated({ item, showSeparator = true }: TimelineItemProps & { showSeparator?: boolean }) {
	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconEdit}
			color="bg-accent text-primary-foreground"
		>
			updated the task
		</TimelineItemWrapper>
	);
}
