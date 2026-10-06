import { IconRocket } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Status } from "./atoms";
import { CommentFeed, type FeedItem } from "./comment";
import { DEMO_TASKS, FEATURED_TASK, ORG } from "./demo-data";
import { RELEASE_KEYS } from "./release-panel";

const SHIPPED = DEMO_TASKS.filter((task) => RELEASE_KEYS.includes(task.key));

interface ReleasePublicProps {
	/** Live vote count for the featured post, so it matches the post card. */
	featuredVotes: number;
	/** The release's own discussion: releases take comments and reactions too. */
	comments: FeedItem[];
	className?: string;
}

/** A published release on the public portal: what shipped, with votes, and the discussion under it. */
export function ReleasePublic({ featuredVotes, comments, className }: ReleasePublicProps) {
	return (
		<div
			className={cn("overflow-hidden rounded-xl border bg-card text-[13px] shadow-2xl shadow-black/50", className)}
		>
			<div className="flex items-center justify-between border-b px-3 py-2 text-[11px] text-muted-foreground">
				<span>{ORG.portal}/releases/v2.4</span>
				<span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">Public portal</span>
			</div>
			<div className="flex flex-col gap-3 p-4">
				<div className="flex items-center gap-2">
					<IconRocket className="size-4 text-primary" />
					<p className="font-semibold text-base">{ORG.name} 2.4</p>
					<span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-success text-xs">Released</span>
				</div>
				<ul className="flex flex-col gap-1.5">
					{SHIPPED.map((task) => (
						<li key={task.key} className="flex items-center gap-2">
							<Status status="done" size={14} />
							<span className="min-w-0 flex-1 truncate">{task.title}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								▲ {task.key === FEATURED_TASK.key ? featuredVotes : task.votes}
							</span>
						</li>
					))}
				</ul>
				<CommentFeed items={comments} className="h-48 border-t" />
			</div>
		</div>
	);
}
