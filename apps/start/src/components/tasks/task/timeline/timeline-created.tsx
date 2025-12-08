import { IconPlus } from "@tabler/icons-react";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCreated({ item }: TimelineItemProps) {
	return (
		<TimelineItemWrapper item={item} icon={IconPlus} color="bg-accent text-primary-foreground" />
	);
}
