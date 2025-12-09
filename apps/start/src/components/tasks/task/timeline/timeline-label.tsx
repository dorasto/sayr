import { IconTagMinus, IconTagPlus } from "@tabler/icons-react";
import { RenderLabel } from "../../shared/label";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineLabelAdded({ item, labels = [] }: TimelineItemProps) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper item={item} icon={IconTagPlus} color="bg-accent text-muted-foreground">
				added a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper item={item} icon={IconTagPlus} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> added{" "}
			<RenderLabel label={label} className="inline-flex !bg-transparent" />
		</TimelineItemWrapper>
	);
}
export function TimelineLabelRemoved({ item, labels = [] }: TimelineItemProps) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper item={item} icon={IconTagMinus} color="bg-accent text-muted-foreground">
				removed a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper item={item} icon={IconTagMinus} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> removed label{" "}
			<RenderLabel label={label} className="inline-flex !bg-transparent" />
		</TimelineItemWrapper>
	);
}
