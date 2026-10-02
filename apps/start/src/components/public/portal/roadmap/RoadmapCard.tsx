import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconChevronUp, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { memo, type MouseEvent } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { LabelTag } from "../ui/LabelTag";
import { ReleaseTag } from "../ui/ReleaseTag";
import { useBoardVote } from "../board/useBoardVote";

interface RoadmapCardProps {
	task: schema.TaskWithLabels;
	/** Name of the post's release, shown as a tag; left out in the "By release" view where the column is the release. */
	releaseName?: string | null;
}

/** One roadmap post: key chip and votes on top, title, then release tag, one label and the comment count. */
function RoadmapCardBase({ task, releaseName }: RoadmapCardProps) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const label = task.labels?.[0];
	const commentCount = task.comments?.length ?? 0;
	const taskKey = formatTaskKey(organization.shortId, task.shortId);
	const linkParams = { orgSlug: organization.slug, shortId: String(task.shortId) };

	const handleVote = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		void vote.toggle();
	};

	return (
		<div className="relative rounded-portal-md border border-portal-line bg-portal-surface px-4 py-3.5 shadow-portal-hl transition-colors focus-within:border-portal-line-2 hover:border-portal-line-2">
			<div className="mb-2 flex items-center justify-between gap-3">
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={linkParams}
					className="relative z-10 rounded-sm font-semibold text-portal-fg-3 text-xs outline-none after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] md:after:hidden hover:text-portal-fg-2"
				>
					{taskKey}
				</Link>
				<button
					type="button"
					aria-pressed={vote.voted}
					aria-label={`Upvote, ${vote.voteCount} ${vote.voteCount === 1 ? "vote" : "votes"}`}
					disabled={vote.disabled}
					onClick={handleVote}
					className={cn(
						"relative z-10 -my-1 -mr-1.5 inline-flex cursor-pointer after:absolute after:-inset-1.5 after:content-[''] md:after:hidden items-center gap-1 rounded-portal-sm px-1.5 py-1 font-semibold text-[13px] tabular-nums outline-none transition-colors",
						vote.voted
							? "text-portal-accent-ink"
							: "text-portal-fg-2 hover:text-portal-accent-ink focus-visible:text-portal-accent-ink",
						vote.disabled && "cursor-not-allowed opacity-50"
					)}
				>
					<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
					{formatCount(vote.voteCount)}
				</button>
			</div>

			<Link
				to="/orgs/$orgSlug/$shortId"
				params={linkParams}
				className="block font-semibold text-[14.5px] leading-[21px] tracking-[-0.006em] outline-none after:absolute after:inset-0 after:rounded-portal-md after:content-['']"
			>
				{task.title}
			</Link>

			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-portal-fg-3">
				{releaseName && <ReleaseTag name={releaseName} />}
				{label && <LabelTag label={label} />}
				<span className="grow" />
				<span className="inline-flex items-center gap-[5px]">
					<IconMessage aria-hidden className="size-3.5" stroke={1.75} />
					<span className="sr-only">Comments: </span>
					{commentCount}
				</span>
			</div>
		</div>
	);
}

export const RoadmapCard = memo(RoadmapCardBase);
