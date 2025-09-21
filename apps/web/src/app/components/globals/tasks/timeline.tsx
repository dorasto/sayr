import type { schema } from "@repo/database";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
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
import { cn } from "@repo/ui/lib/utils";
import { formatDateTime } from "@repo/util";
import { IconLabelFilled, IconPlus, IconTag } from "@tabler/icons-react";
import { label } from "motion/react-client";
import type { PartialBlock } from "node_modules/@blocknote/core/types/src/blocks/defaultBlocks";
import { Editor } from "../../blocknote/DynamicEditor";
import RenderUser from "./render-user";

interface GlobalTimelineProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTimeline({ task }: GlobalTimelineProps) {
	const itemTypes = {
		created: {
			label: "created a task",
			action: "created",
			icon: IconPlus,
			color: "bg-primary text-primary-foreground",
		},
		labelAdded: {
			label: "added a label",
			action: "labelAdded",
			icon: IconTag,
			color: "bg-accent text-muted-foreground",
			labels: task.labels,
		},
	};
	const items = [
		{
			id: 1,
			date: formatDateTime(task.createdAt as Date),
			title: task.createdBy.name,
			action: itemTypes.created.label,
			type: "created",
			description: task.description,
		},
		{
			id: 2,
			date: formatDateTime(task.createdAt as Date),
			title: task.createdBy.name,
			action: itemTypes.labelAdded.label,
			type: "labelAdded",
			labels: task.labels,
		},
		{
			id: 3,
			date: "5 minutes ago",
			title: "username",
			action: "assigned",
			type: "created", // Using created as fallback for now
			description: task.description,
		},
		{
			id: 4,
			date: "2 minutes ago",
			title: "username",
			action: "closed the issue",
			type: "created", // Using created as fallback for now
			description: task.description,
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
						<TimelineTitle className="mt-0.5 flex items-center gap-1">
							<RenderUser task={task} />{" "}
							<Label variant={"heading"} className="text-sm font-normal">
								<span>{item.action}</span> on {item.date}
							</Label>
						</TimelineTitle>
						<TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
							{(() => {
								const itemType = itemTypes[item.type as keyof typeof itemTypes];
								const IconComponent = itemType.icon;
								return (
									<Avatar className={cn("h-10 w-10 rounded-full", itemType.color)}>
										<AvatarFallback className="rounded-full bg-transparent">
											<IconComponent size={20} />
										</AvatarFallback>
									</Avatar>
								);
							})()}
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
