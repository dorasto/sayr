"use client";

import { useBoardEntity } from "../core/board-data";
import { formatEntityCount } from "../core/entity";
import { useVisibleTaskCount } from "../filter/use-visible-task-count";

/**
 * Plain "123 tasks" readout for the page toolbar — the count currently visible with every active filter/view
 * applied, in the board entity's noun ("3 releases" on a release board).
 */
export function TaskCountLabel() {
	const count = useVisibleTaskCount();
	const { noun } = useBoardEntity();

	return <span className="text-xs text-muted-foreground">{formatEntityCount(noun, count)}</span>;
}
