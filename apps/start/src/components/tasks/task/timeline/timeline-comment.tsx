import { IconMessageDots } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineComment({ item, availableUsers, categories, tasks }: TimelineItemProps) {
	return (
		<TimelineItemWrapper
			item={item}
			availableUsers={availableUsers || []}
			categories={categories || []}
			tasks={tasks || []}
			icon={IconMessageDots}
			color="bg-accent text-primary-foreground"
		/>
	);
}
