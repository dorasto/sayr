"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import RenderUser from "./render-user";

interface TaskNewCommentContentProps {
	task: schema.TaskWithLabels;
}
export function TaskCommentsContent({ task }: TaskNewCommentContentProps) {
	return (
		<div>
			{task.comments.map((e) => {
				return (
					<>
						<RenderUser name={e.createdBy?.name || ""} image={e.createdBy?.image || ""} />
						<Editor key={e.id} readonly value={e.blockNote as PartialBlock[]} />
					</>
				);
			})}
		</div>
	);
}
