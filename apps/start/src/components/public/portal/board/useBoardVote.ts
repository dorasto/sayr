import type { schema } from "@repo/database";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { updateBoardTasks } from "@/hooks/portal/useBoardList";
import { useVote, type VoteState } from "@/hooks/portal/useVote";

/**
 * `useVote` for a post on the board: besides the optimistic flip it writes the new count back into the cached list, so
 * every copy of the post on screen (a row, a similar-post suggestion) agrees and the count survives a re-render.
 */
export function useBoardVote(task: Pick<schema.TaskWithLabels, "id" | "voteCount" | "status">) {
	const { organization } = usePublicOrganizationLayout();
	const queryClient = useQueryClient();
	const taskId = task.id;

	const onChange = useCallback(
		({ voteCount }: VoteState) =>
			updateBoardTasks(queryClient, organization.id, (current) =>
				current.id === taskId && current.voteCount !== voteCount ? { ...current, voteCount } : current
			),
		[queryClient, organization.id, taskId]
	);

	return useVote({ organizationId: organization.id, task, onChange });
}
