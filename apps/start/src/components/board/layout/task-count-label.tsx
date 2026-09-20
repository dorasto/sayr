"use client";

import { useVisibleTaskCount } from "../filter/use-visible-task-count";

/** Plain "123 tasks" readout for the page toolbar — the count currently visible with every active filter/view applied. */
export function TaskCountLabel() {
	const count = useVisibleTaskCount();

	return (
		<span className="text-xs text-muted-foreground">
			{count} {count === 1 ? "task" : "tasks"}
		</span>
	);
}
