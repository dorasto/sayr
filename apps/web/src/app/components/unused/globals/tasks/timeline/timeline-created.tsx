import { IconPlus } from "@tabler/icons-react";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCreated({ item }: TimelineItemProps) {
	return (
		<TimelineItemWrapper item={item} icon={IconPlus} color="bg-accent text-primary-foreground">
			Created by <AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} />
		</TimelineItemWrapper>
	);
}
