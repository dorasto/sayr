import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import {
	Timeline,
	TimelineContent,
	TimelineDate,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@repo/ui/components/tomui/timeline";
import { formatDateTime } from "@repo/util";
import type { PartialBlock } from "node_modules/@blocknote/core/types/src/blocks/defaultBlocks";
import { Editor } from "../../blocknote/DynamicEditor";

interface GlobalTimelineProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTimeline({ task }: GlobalTimelineProps) {
	const items = [
		{
			id: 1,
			date: formatDateTime(task.createdAt as Date),
			title: task.createdBy.name,
			action: "created a task",
			description: task.description,
			image: task.createdBy.image || "/avatar.jpg",
		},
		{
			id: 2,
			date: formatDateTime(task.createdAt as Date),
			title: task.createdBy.name,
			action: "Added the label (create clicky logic and render later)",
			image: task.createdBy.image || "/avatar.jpg",
		},
		{
			id: 3,
			date: "5 minutes ago",
			title: "username",
			action: "assigned",
			description: task.description,
			image: "/avatar.jpg",
		},
		{
			id: 4,
			date: "2 minutes ago",
			title: "username",
			action: "closed the issue",
			description: task.description,
			image: "/avatar.jpg",
		},
	];
	return (
		<Timeline>
			{items.map((item) => (
				<TimelineItem
					key={item.id}
					step={item.id}
					className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-8"
				>
					<TimelineHeader>
						<TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
						<TimelineTitle className="mt-0.5">
							<Label variant={"heading"} className="font-bold text-base">
								{item.title}
							</Label>{" "}
							<Label variant={"heading"} className="text-sm font-normal">
								<span>{item.action}</span> on {item.date}
							</Label>
						</TimelineTitle>
						<TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
							<Avatar className="h-10 w-10 rounded-full bg-primary">
								<AvatarImage src={item.image} alt={item.title} />
								<AvatarFallback className="rounded-full bg-transparent uppercase">{"AA"}</AvatarFallback>
							</Avatar>
						</TimelineIndicator>
					</TimelineHeader>
					{item.description ? (
						<TimelineContent className="text-foreground mt-2 rounded-lg border px-4 py-3">
							<Editor readonly={true} value={item.description as PartialBlock[]} />
						</TimelineContent>
					) : null}
				</TimelineItem>
			))}
		</Timeline>
	);
}
