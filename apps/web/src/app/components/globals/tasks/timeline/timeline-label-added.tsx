import { IconTag } from "@tabler/icons-react";
import { RenderLabel } from "../label";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineLabelAdded({ item, labels = [] }: TimelineItemProps) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-muted-foreground">
				added a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> added{" "}
			<RenderLabel label={label} className="inline-flex" />
		</TimelineItemWrapper>
	);
}
