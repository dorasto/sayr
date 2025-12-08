import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineAssigneeAdded({ item, availableUsers = [] }: TimelineItemProps) {
	const user = availableUsers.find((user) => user.id === item.toValue);
	return (
		<TimelineItemWrapper item={item} icon={IconUserPlus} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> assigned{" "}
			<AvatarWithName name={user?.name || "Unknown"} image={user?.image || ""} />
		</TimelineItemWrapper>
	);
}
export function TimelineAssigneeRemoved({ item, availableUsers = [] }: TimelineItemProps) {
	const user = availableUsers.find((user) => user.id === item.toValue);
	return (
		<TimelineItemWrapper item={item} icon={IconUserMinus} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> removed
			<AvatarWithName name={user?.name || "Unknown"} image={user?.image || ""} />
		</TimelineItemWrapper>
	);
}
