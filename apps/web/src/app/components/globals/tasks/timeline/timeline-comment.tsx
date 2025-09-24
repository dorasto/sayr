import { IconMessageDots } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineComment({ item }: TimelineItemProps) {
	return (
		<TimelineItemWrapper item={item} icon={IconMessageDots} color="bg-primary text-primary-foreground">
			commented
		</TimelineItemWrapper>
	);
}
