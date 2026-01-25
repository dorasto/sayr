import { IconPlus } from "@tabler/icons-react";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";
import { AvatarImage } from "@repo/ui/components/avatar";
import { InlineLabel } from "../../shared/inlinelabel";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";

export function TimelineCreated({
	item,
	availableUsers,
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	return (
		<>
			<TimelineItemWrapper
				showSeparator={showSeparator}
				availableUsers={availableUsers || []}
				item={item}
				icon={IconPlus}
				color="bg-accent text-primary-foreground"
				variant="description"
			/>
			<div className="flex flex-col gap-3 pb-4">
				<Separator />
				<Label variant={"heading"}>Activity</Label>
			</div>
			<TimelineItemWrapper
				showSeparator={showSeparator}
				availableUsers={availableUsers || []}
				item={item}
				icon={IconPlus}
				color="bg-accent text-primary-foreground"
			>
				<InlineLabel text={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> created this task
			</TimelineItemWrapper>
		</>
	);
}
