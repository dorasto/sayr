import { formatCount } from "@repo/util";
import { VoteButton } from "@/components/public/portal/ui/VoteButton";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";

/** Vote count, a line on what voting means, and the vote toggle for the open post. */
export function VoteCard() {
	const { task, isVoted, voteCount, voteDisabled, handleVote } = usePublicTask();

	return (
		<div className="rounded-xl border bg-card p-5">
			<div className="mb-1 flex items-baseline gap-2">
				<span className="font-bold text-4xl text-foreground leading-10 tracking-[-0.03em] tabular-nums">
					{formatCount(voteCount)}
				</span>
				<span className="text-muted-foreground text-sm">
					{voteCount === 1 ? "person wants this" : "people want this"}
				</span>
			</div>
			<p className="mb-4 text-muted-foreground text-[13px]">
				{voteDisabled || task.status === "canceled"
					? "Voting is closed on this post."
					: "Your vote helps the team decide what to build next."}
			</p>
			<VoteButton count={voteCount} voted={isVoted} disabled={voteDisabled} onToggle={handleVote} />
		</div>
	);
}
