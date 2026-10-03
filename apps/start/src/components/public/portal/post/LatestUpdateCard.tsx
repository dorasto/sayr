import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ensureCdnUrl, formatDateCompact, getDisplayName, getInitials } from "@repo/util";
import { lazy, Suspense } from "react";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import { Pill } from "@/components/public/portal/ui/Pill";
import type { CommentData } from "@/components/public/public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface LatestUpdateCardProps {
	/** The newest top-level public comment written by a team member (see `getLatestUpdate`). */
	comment: CommentData;
	tasks?: schema.TaskWithLabels[];
}

/** "Latest update · 28 Sep": the team's most recent comment, pulled out above the description. */
export function LatestUpdateCard({ comment, tasks }: LatestUpdateCardProps) {
	const name = comment.createdBy ? getDisplayName(comment.createdBy) : "Team";

	return (
		<section aria-label="Latest update" className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
			<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
				<Avatar className="size-5">
					{comment.createdBy?.image ? (
						<AvatarImage src={ensureCdnUrl(comment.createdBy.image)} alt={name} />
					) : null}
					<AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
				</Avatar>
				<span className="font-medium text-foreground text-sm">{name}</span>
				<Pill variant="team" />
				<span>Latest update · {formatDateCompact(comment.createdAt)}</span>
			</div>
			<div className={COMMENT_PROSE}>
				<Suspense fallback={<Skeleton className="h-5 w-3/4" />}>
					<Editor readonly defaultContent={comment.content} tasks={tasks} hideBlockHandle />
				</Suspense>
			</div>
		</section>
	);
}
