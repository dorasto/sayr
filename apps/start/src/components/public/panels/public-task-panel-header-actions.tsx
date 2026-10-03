import { Button } from "@repo/ui/components/button";
import { IconArrowUpRight } from "@tabler/icons-react";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";

/**
 * The Details drawer's header actions, beside the close button: the vote chip, and for org members an icon button that
 * opens the post in the admin app.
 */
export function PublicTaskPanelHeaderActions() {
	const { organization } = usePublicOrganizationLayout();
	const { task, isMember, isVoted, voteCount, voteDisabled, handleVote } = usePublicTask();

	return (
		<>
			<VoteBox count={voteCount} voted={isVoted} disabled={voteDisabled} onToggle={handleVote} size="chip" />
			{isMember && (
				<Button
					variant="ghost"
					size="icon"
					aria-label="Open internally"
					tooltipText="Open in the admin app"
					tooltipSide="bottom"
					nativeButton={false}
					render={
						// biome-ignore lint/a11y/useAnchorContent: the Button supplies the icon and aria-label
						<a
							href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
				>
					<IconArrowUpRight aria-hidden />
				</Button>
			)}
		</>
	);
}
