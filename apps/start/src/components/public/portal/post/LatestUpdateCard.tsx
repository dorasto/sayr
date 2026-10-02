import { cn } from "@repo/ui/lib/utils";
import { formatDateCompact, getDisplayName } from "@repo/util";
import { lazy, Suspense } from "react";
import type { schema } from "@repo/database";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import type { CommentData } from "@/components/public/public-comments-types";
import { Pill } from "@/components/public/portal/ui/Pill";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface LatestUpdateCardProps {
	/** The newest top-level public comment written by a team member (see `getLatestUpdate`). */
	comment: CommentData;
	/** Whether the commenter also wrote the post. */
	isAuthor?: boolean;
	tasks?: schema.TaskWithLabels[];
	className?: string;
}

/** "Latest update · 28 Sep": the team's most recent comment, pulled out above the description. */
export function LatestUpdateCard({ comment, isAuthor = false, tasks, className }: LatestUpdateCardProps) {
	const name = comment.createdBy ? getDisplayName(comment.createdBy) : "Team";

	return (
		<section
			aria-label="Latest update"
			className={cn(
				"flex gap-3.5 rounded-portal-lg border border-portal-accent-line bg-portal-accent-soft px-[18px] py-4",
				className
			)}
		>
			<PortalAvatar name={name} image={comment.createdBy?.image} size={34} ring />
			<div className="min-w-0 flex-1">
				<div className="mb-1.5 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
					<b className="font-semibold text-portal-fg text-sm">{name}</b>
					{isAuthor && <Pill variant="author" />}
					<Pill variant="team" />
					<span className="text-[13px] text-portal-fg-3">
						Latest update · {formatDateCompact(comment.createdAt)}
					</span>
				</div>
				<div className={COMMENT_PROSE}>
					<Suspense fallback={<div className="h-5 w-3/4 animate-pulse rounded bg-portal-raised" />}>
						<Editor readonly defaultContent={comment.content} tasks={tasks} hideBlockHandle />
					</Suspense>
				</div>
			</div>
		</section>
	);
}
