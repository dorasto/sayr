import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconChevronUp, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createContext, type MouseEvent, memo, useContext } from "react";
import type { BoardCardRendererProps } from "@/components/board/core/renderers";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { useBoardVote } from "../board/useBoardVote";
import { LabelTag } from "../ui/LabelTag";
import { ReleaseTag } from "../ui/ReleaseTag";

export interface RoadmapCardContextValue {
	/** The "By release" column already says which release it is, so the card drops its release tag there. */
	showReleaseTag: boolean;
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
}

/**
 * What `RoadmapBoard` tells its cards. The board renders the card through `renderers.card` (which only passes the
 * task), so the roadmap's per-view settings reach it through this context.
 */
export const RoadmapCardContext = createContext<RoadmapCardContextValue | undefined>(undefined);

/**
 * One roadmap post, the roadmap's `renderers.card`: key chip and votes on top, title, then release tag, one label and
 * the comment count. The whole card is the link to the post.
 */
export const RoadmapBoardCard = memo(function RoadmapBoardCard({ task }: BoardCardRendererProps) {
	const context = useContext(RoadmapCardContext);
	if (context === undefined) {
		throw new Error("RoadmapBoardCard must be used within RoadmapBoard");
	}
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const label = task.labels?.[0];
	const commentCount = task.comments?.length ?? 0;
	const taskKey = formatTaskKey(organization.shortId, task.shortId);
	// Release tag: hidden for archived releases (nothing useful to link a reader to).
	const release = context.showReleaseTag && task.releaseId ? context.releasesById.get(task.releaseId) : undefined;
	const releaseName = release && release.status !== "archived" ? release.name : null;

	const handleVote = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		void vote.toggle();
	};

	return (
		<Link
			to="/orgs/$orgSlug/$shortId"
			params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
			className="block rounded-lg border bg-card px-4 py-3.5 outline-none transition-colors hover:bg-accent"
		>
			<div className="mb-2 flex items-center justify-between gap-3">
				<span className="font-semibold text-muted-foreground text-xs hover:text-foreground">{taskKey}</span>
				{/* Below `md` the button pads out (and pulls back with negative margins) to a bigger touch target. */}
				<button
					type="button"
					aria-pressed={vote.voted}
					aria-label={`Upvote, ${vote.voteCount} ${vote.voteCount === 1 ? "vote" : "votes"}`}
					disabled={vote.disabled}
					onClick={handleVote}
					className={cn(
						"-my-2.5 -mr-3 -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-2.5 font-semibold text-[13px] tabular-nums outline-none transition-colors md:-my-1 md:-mr-1.5 md:ml-0 md:px-1.5 md:py-1",
						vote.voted ? "text-primary" : "text-muted-foreground hover:text-primary focus-visible:text-primary",
						vote.disabled && "cursor-not-allowed opacity-50"
					)}
				>
					<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
					{formatCount(vote.voteCount)}
				</button>
			</div>

			<span className="block font-semibold text-[14.5px] leading-[21px] tracking-[-0.006em]">{task.title}</span>

			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
				{releaseName && <ReleaseTag name={releaseName} />}
				{label && <LabelTag label={label} />}
				<span className="grow" />
				<span className="inline-flex items-center gap-[5px]">
					<IconMessage aria-hidden className="size-3.5" stroke={1.75} />
					<span className="sr-only">Comments: </span>
					{commentCount}
				</span>
			</div>
		</Link>
	);
});
