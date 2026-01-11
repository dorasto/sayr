import { IconTagMinus, IconTagPlus } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { RenderLabel } from "../../shared/label";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineLabelAdded({ item, labels = [], showSeparator = true }: TimelineItemProps & { showSeparator?: boolean }) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper
				showSeparator={showSeparator}
				item={item}
				icon={IconTagPlus}
				color="bg-accent text-muted-foreground"
			>
				added a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconTagPlus}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				text={item.actor?.name || "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			added{" "}
			<RenderLabel label={label} className="inline-flex bg-transparent!" />
		</TimelineItemWrapper>
	);
}

export function TimelineLabelRemoved({ item, labels = [], showSeparator = true }: TimelineItemProps & { showSeparator?: boolean }) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper
				showSeparator={showSeparator}
				item={item}
				icon={IconTagMinus}
				color="bg-accent text-muted-foreground"
			>
				removed a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper
			showSeparator={showSeparator}
			item={item}
			icon={IconTagMinus}
			color="bg-accent text-primary-foreground"
		>
			<InlineLabel
				text={item.actor?.name || "Unknown"}
				image={item.actor?.image || ""}
			/>{" "}
			removed label{" "}
			<RenderLabel label={label} className="inline-flex bg-transparent!" />
		</TimelineItemWrapper>
	);
}
