"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";

interface RenderUserProps {
	task: schema.TaskWithLabels;
}
export default function RenderUser({ task }: RenderUserProps) {
	return (
		<div className="flex items-center gap-1">
			<Avatar className="h-5 w-5 rounded-full bg-primary">
				<AvatarImage src={task.createdBy.image || "/avatar.jpg"} alt={task.createdBy.name} />
				<AvatarFallback className="rounded-full bg-transparent uppercase">{"AA"}</AvatarFallback>
			</Avatar>
			<Label variant={"heading"} className="font-bold text-base">
				{task.createdBy.name}
			</Label>
		</div>
	);
}
