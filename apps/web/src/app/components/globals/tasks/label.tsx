"use client";

import { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";

interface GlobalTaskLabelsProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTaskLabels({ task }: GlobalTaskLabelsProps) {
	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Labels</Label>

			{task.labels && task.labels.length > 0 && (
				<div className="flex gap-1">
					{task.labels.map((label) => (
						<Badge
							key={label.id}
							variant="outline"
							className="flex overflow-hidden justify-center h-full flex-shrink-0 items-center rounded px-2.5 text-xs cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								// Add label click logic here
							}}
						>
							<div className="flex items-center gap-1.5 overflow-hidden">
								<span
									className="h-2 w-2 flex-shrink-0 rounded-full"
									style={{ backgroundColor: label.color || "#cccccc" }}
								/>
								<div className="line-clamp-1 inline-block w-auto max-w-[120px] truncate">{label.name}</div>
							</div>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
