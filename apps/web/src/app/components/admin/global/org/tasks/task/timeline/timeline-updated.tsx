import { IconEdit } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineUpdated({ item }: TimelineItemProps) {
	return (
		<TimelineItemWrapper item={item} icon={IconEdit} color="bg-accent text-primary-foreground">
			updated the task
		</TimelineItemWrapper>
	);
}
