import { IconMessageCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Status } from "./atoms";
import { CommentFeed, type FeedItem } from "./comment";
import { type DemoStatus, FEATURED_TASK, ORG, PUBLIC_STATUS_LABEL } from "./demo-data";

export type { FeedItem as PostComment } from "./comment";

interface PortalPostProps {
	/** Internal status; shown with its public label (backlog → Open, done → Shipped). */
	status: DemoStatus;
	votes: number;
	/** Whether the visitor has upvoted; adds one and highlights the vote button. */
	voted?: boolean;
	onVote?: () => void;
	/** Small line under the post, e.g. "Planned for v2.4". */
	detail?: string;
	comments?: FeedItem[];
	className?: string;
}

/**
 * The featured task as it appears on the org's public portal: a votable post
 * with its public status and conversation, and none of the internal fields.
 * Everything animates in place (no remounts) so a looping demo stays smooth.
 */
export function PortalPost({
	status,
	votes,
	voted = false,
	onVote,
	detail,
	comments = [],
	className,
}: PortalPostProps) {
	const shown = comments.filter((comment) => comment.visible).length;

	return (
		<div
			className={cn("overflow-hidden rounded-xl border bg-card text-[13px] shadow-2xl shadow-black/50", className)}
		>
			<div className="flex items-center justify-between border-b px-3 py-2 text-[11px] text-muted-foreground">
				<span>{ORG.portal}</span>
				<span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">Signed in as team</span>
			</div>
			<div className="flex flex-col gap-2 p-4">
				<div className="flex items-center justify-between">
					<span className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs">
						<Status status={status} size={14} /> {PUBLIC_STATUS_LABEL[status]}
					</span>
					<button
						type="button"
						onClick={onVote}
						aria-pressed={voted}
						aria-label={voted ? "Remove your vote" : "Upvote this post"}
						className={cn(
							"inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs tabular-nums transition-colors",
							voted ? "border-primary/50 bg-primary/15 text-primary" : "hover:bg-accent"
						)}
					>
						<span aria-hidden>▲</span>
						{votes + (voted ? 1 : 0)}
					</button>
				</div>
				<p className="font-semibold text-base">{FEATURED_TASK.title}</p>
				<p className="line-clamp-2 text-muted-foreground">
					We'd love our short links on our own domain, like go.ourbrand.com, instead of the default one.
				</p>
				<div className="flex items-center gap-3 text-muted-foreground text-xs">
					<span>Feature request</span>
					<span className="flex items-center gap-1 tabular-nums">
						<IconMessageCircle className="size-3.5" /> {(FEATURED_TASK.comments ?? 0) + shown}
					</span>
					{detail && <span>{detail}</span>}
				</div>

				{comments.length > 0 && <CommentFeed items={comments} className="mt-1 h-60 border-t" />}
			</div>
		</div>
	);
}
