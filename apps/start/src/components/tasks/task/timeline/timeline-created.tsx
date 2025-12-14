import { IconPlus } from "@tabler/icons-react";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCreated({ item, availableUsers }: TimelineItemProps) {
	return (
		<TimelineItemWrapper
			availableUsers={availableUsers || []}
			item={item}
			icon={IconPlus}
			color="bg-accent text-primary-foreground"
		/>
	);
}
