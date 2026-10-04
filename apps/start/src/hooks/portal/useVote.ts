import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { isVotingClosed } from "@/lib/portal/status";
import { type PublicVoteEntry, publicVotesKey, usePublicVotes } from "./usePublicVotes";

export interface VoteState {
	voted: boolean;
	voteCount: number;
}

export interface UseVoteArgs {
	organizationId: string;
	task: { id: string; voteCount: number; status: string };
	/** Fired on the optimistic flip, again with the server's answer, and on rollback — lets a list sync its own copy. */
	onChange?: (state: VoteState) => void;
}

export interface UseVoteResult extends VoteState {
	/** Voting is closed (canceled posts only). Votes are never login-gated. */
	disabled: boolean;
	/** A toggle is in flight; extra clicks are ignored until it settles. */
	pending: boolean;
	toggle: () => Promise<void>;
}

/**
 * The one optimistic vote toggle for the public portal (replaces the inline copies in `task-view.tsx` and
 * `ContextPublicOrgTask.tsx`). Flips the viewer's vote in the shared `["votes", orgId]` cache and the count
 * immediately, reconciles with the server's `{ voted, voteCount }`, and rolls back with an error toast on failure.
 * Anonymous voting keeps working: nothing here checks the session.
 */
export function useVote({ organizationId, task, onChange }: UseVoteArgs): UseVoteResult {
	const queryClient = useQueryClient();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { votes } = usePublicVotes(organizationId);

	const [localCount, setLocalCount] = useState<number | null>(null);
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);

	// A fresher count from the parent (SSE, refetch) supersedes our optimistic copy.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset keyed on the parent's values only
	useEffect(() => {
		setLocalCount(null);
	}, [task.id, task.voteCount]);

	const voted = votes.some((entry) => entry.taskId === task.id);
	const voteCount = localCount ?? task.voteCount;
	const disabled = isVotingClosed(task.status);

	const toggle = useCallback(async () => {
		if (disabled || pendingRef.current) return;
		pendingRef.current = true;
		setPending(true);

		const key = publicVotesKey(organizationId);
		const previousVotes = queryClient.getQueryData<PublicVoteEntry[]>(key);
		const previousState: VoteState = { voted, voteCount };
		const nextVoted = !voted;
		const optimistic: VoteState = {
			voted: nextVoted,
			voteCount: Math.max(0, voteCount + (nextVoted ? 1 : -1)),
		};

		const applyVoted = (isVoted: boolean) =>
			queryClient.setQueryData<PublicVoteEntry[]>(key, (old) => {
				const without = (old ?? []).filter((entry) => entry.taskId !== task.id);
				return isVoted ? [...without, { taskId: task.id, voteCount: 0, count: 1 }] : without;
			});

		applyVoted(nextVoted);
		setLocalCount(optimistic.voteCount);
		onChange?.(optimistic);

		try {
			const response = await CreateTaskVoteAction(organizationId, task.id, sseClientId);
			if (!response.success || !response.data) {
				throw new Error(response.error ?? "Failed to update vote");
			}
			const confirmed: VoteState = { voted: response.data.voted, voteCount: response.data.voteCount };
			applyVoted(confirmed.voted);
			setLocalCount(confirmed.voteCount);
			onChange?.(confirmed);
		} catch (error) {
			console.error(error);
			headlessToast.error({
				title: "Failed to vote",
				description: "Could not update vote.",
			});
			if (previousVotes === undefined) {
				// setQueryData(undefined) is a no-op, so refetch the truth instead.
				void queryClient.invalidateQueries({ queryKey: key });
			} else {
				queryClient.setQueryData(key, previousVotes);
			}
			setLocalCount(previousState.voteCount);
			onChange?.(previousState);
		} finally {
			pendingRef.current = false;
			setPending(false);
		}
	}, [disabled, organizationId, queryClient, sseClientId, task.id, voteCount, voted, onChange]);

	return { voted, voteCount, disabled, pending, toggle };
}
