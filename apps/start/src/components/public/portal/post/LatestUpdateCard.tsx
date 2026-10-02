import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDateCompact, getDisplayName, getInitials } from "@repo/util";
import { lazy, Suspense } from "react";
import type { schema } from "@repo/database";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import type { CommentData } from "@/components/public/public-comments-types";
import { Pill } from "@/components/public/portal/ui/Pill";

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
			className={cn("flex gap-3.5 rounded-xl border border-primary/50 bg-primary/15 px-[18px] py-4", className)}
		>
			<Avatar className="size-[34px]">
				{comment.createdBy?.image ? <AvatarImage src={ensureCdnUrl(comment.createdBy.image)} alt={name} /> : null}
				<AvatarFallback className="text-sm font-semibold">{getInitials(name)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="mb-1.5 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
					<b className="font-semibold text-foreground text-sm">{name}</b>
					{isAuthor && <Pill variant="author" />}
					<Pill variant="team" />
					<span className="text-[13px] text-muted-foreground">
						Latest update · {formatDateCompact(comment.createdAt)}
					</span>
				</div>
				<div className={COMMENT_PROSE}>
					<Suspense fallback={<Skeleton className="h-5 w-3/4" />}>
						<Editor readonly defaultContent={comment.content} tasks={tasks} hideBlockHandle />
					</Suspense>
				</div>
			</div>
		</section>
	);
}
