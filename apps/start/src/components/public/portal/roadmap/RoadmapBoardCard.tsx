import { memo, useContext } from "react";
import type { BoardCardRendererProps } from "@/components/board/core/renderers";
import { FieldCategory } from "@/components/board/fields/field-category";
import type { BoardField } from "@/components/board/fields/field-toolbar";
import { BoardCard } from "@/components/board/views/board-card";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useBoardVote } from "../board/useBoardVote";
import { PeekContext } from "../peek/peek-context";
import { VoteBox } from "../ui/VoteBox";

/** Public cards keep the chip row for the release; the category leads the card and labels are left out. */
const PUBLIC_CARD_FIELDS: BoardField[] = ["release"];

/**
 * One roadmap post, the roadmap's `renderers.card`: the admin board's own `BoardCard` (read-only field chips), linking
 * to the public post. The category takes the task key's place, the release fills the chip row and the vote button
 * replaces the card's read-only vote count. Inside the Feedback board's Peek provider a click opens the post in the
 * side panel instead, like a list row.
 */
export const RoadmapBoardCard = memo(function RoadmapBoardCard({ task }: BoardCardRendererProps) {
	const { organization } = usePublicOrganizationLayout();
	const peek = useContext(PeekContext);
	const vote = useBoardVote(task);

	return (
		<BoardCard
			task={task}
			link={{
				to: "/orgs/$orgSlug/$shortId",
				params: { orgSlug: organization.slug, shortId: String(task.shortId) },
			}}
			onLinkClick={(event) => peek?.openPost(task, event)}
			header={task.category ? <FieldCategory task={task} /> : null}
			fields={PUBLIC_CARD_FIELDS}
			selected={peek?.shortId === task.shortId}
			vote={
				<VoteBox
					size="chip"
					count={vote.voteCount}
					voted={vote.voted}
					disabled={vote.disabled}
					onToggle={vote.toggle}
				/>
			}
		/>
	);
});
