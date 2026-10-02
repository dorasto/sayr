import type { BoardRowRendererProps } from "@/components/board/core/renderers";
import { PublicTaskItem } from "../../task-item";
import { usePublicPostProps } from "./public-posts-context";

/**
 * The board's list-row renderer (`renderers.row`): the existing public `PublicTaskItem`, wired to the page's
 * contexts. Always flat: the public list is ranked server-side and shows subtasks as ordinary posts.
 */
export function PublicBoardRow({ task }: BoardRowRendererProps) {
	return <PublicTaskItem task={task} {...usePublicPostProps(task)} />;
}
