import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineAssigneeAdded({
	item,
	availableUsers = [],
}: TimelineItemProps) {
	const user = availableUsers.find((user) => user.id === item.toValue);
	const selfAssign = item.actor?.id === user?.id;
	return selfAssign ? (
		<TimelineItemWrapper
			item={item}
			icon={IconUserPlus}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				text={item.actor?.name || "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			assigned themself
		</TimelineItemWrapper>
	) : (
		<TimelineItemWrapper
			item={item}
			icon={IconUserPlus}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				text={item.actor?.name || "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			assigned{" "}
			<InlineLabel text={user?.name || "Unknown"} image={user?.image || ""} />
		</TimelineItemWrapper>
	);
}
export function TimelineAssigneeRemoved({
	item,
	availableUsers = [],
}: TimelineItemProps) {
	const user = availableUsers.find((user) => user.id === item.toValue);
	return (
		<TimelineItemWrapper
			item={item}
			icon={IconUserMinus}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				text={item.actor?.name || "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			removed
			<InlineLabel text={user?.name || "Unknown"} image={user?.image || ""} />
		</TimelineItemWrapper>
	);
}
