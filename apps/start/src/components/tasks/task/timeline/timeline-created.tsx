import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { getDisplayName } from "@repo/util";
import { IconPlus } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCreated({
	item,
	availableUsers,
	showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
	return (
		<>
			{/* Activity section header */}
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
				<InlineLabel
					className="text-muted-foreground hover:text-foreground"
					text={item.actor ? getDisplayName(item.actor) : "Unknown"}
					image={item.actor?.image || ""}
				/>{" "}
				created this task
			</TimelineItemWrapper>
		</>
	);
}
