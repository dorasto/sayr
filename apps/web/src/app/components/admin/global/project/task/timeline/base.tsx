import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
	TimelineContent,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@repo/ui/components/tomui/timeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTime, formatDateTimeFromNow } from "@repo/util";
import type { PartialBlock } from "node_modules/@blocknote/core/types/src/blocks/defaultBlocks";
import { Editor } from "../../../../../blocknote/DynamicEditor";
import type { TimelineItemWrapperProps } from "./types";

export function TimelineItemWrapper({ item, icon: Icon, color, children }: TimelineItemWrapperProps) {
	return (
		<TimelineItem
			key={item.id}
			step={item.timelineNumber}
			className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-8"
		>
			<TimelineHeader>
				<TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
				<TimelineTitle className="mt-0.5">
					<Label
						variant={"heading"}
						className="text-sm font-normal leading-relaxed items-center flex flex-wrap gap-1"
					>
						{children}{" "}
						<Tooltip>
							<TooltipTrigger className="text-sm">
								{formatDateTimeFromNow(item.createdAt as Date)}
							</TooltipTrigger>
							<TooltipContent>{formatDateTime(item.createdAt as Date)}</TooltipContent>
						</Tooltip>
					</Label>
				</TimelineTitle>
				<TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
					<Avatar className={cn("h-10 w-10 rounded-full", color)}>
						<AvatarFallback className="rounded-full bg-transparent">
							<Icon size={20} />
						</AvatarFallback>
					</Avatar>
				</TimelineIndicator>
			</TimelineHeader>
			{item.blockNote ? (
				<TimelineContent className="text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50">
					<Editor readonly={true} value={item.blockNote as PartialBlock[]} />
				</TimelineContent>
			) : null}
		</TimelineItem>
	);
}

export function AvatarWithName({ name, image }: { name: string; image: string }) {
	return (
		<Badge
			variant={"secondary"}
			className="inline-flex items-center gap-1 justify-center h-5 bg-accent border border-border"
		>
			<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
				<AvatarImage src={image || "/avatar.jpg"} alt={name} />
				<AvatarFallback className="rounded-full bg-transparent uppercase">{name.slice(0, 2)}</AvatarFallback>
			</Avatar>
			<span>{name}</span>
		</Badge>
	);
}
