import { IconLock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { DemoPerson } from "./demo-data";

export interface DemoReaction {
	emoji: string;
	count: number;
}

export interface DemoComment {
	id: string;
	author: DemoPerson;
	text: string;
	/** A reply from the org's team (shows a Team badge). */
	team?: boolean;
	/** Internal comments are visible to org members only, shown in the app's tinted internal box. */
	internal?: boolean;
	reactions?: DemoReaction[];
}

/**
 * One comment, styled like the app's comment thread: avatar, name, a Team or
 * Internal badge, the text, and reaction pills.
 */
export function Comment({ comment }: { comment: DemoComment }) {
	return (
		<div
			className={cn(
				"flex flex-col gap-1 rounded-lg",
				comment.internal && "border border-internal-border bg-internal px-2 py-1.5"
			)}
		>
			<div className="flex items-center gap-2 text-xs">
				<span
					className="inline-flex size-5 shrink-0 items-center justify-center rounded-full font-semibold text-[8px] text-white"
					style={{ background: comment.author.color }}
				>
					{comment.author.initials}
				</span>
				<span className="font-medium">{comment.author.name}</span>
				{comment.team && !comment.internal && (
					<span className="rounded bg-primary/15 px-1 text-[10px] text-primary">Team</span>
				)}
				{comment.internal && (
					<span className="inline-flex items-center gap-0.5 rounded border px-1 text-[10px] text-muted-foreground">
						<IconLock className="size-2.5" /> Internal
					</span>
				)}
			</div>
			<p className="pl-7 text-[13px] text-muted-foreground leading-snug">{comment.text}</p>
			{comment.reactions && comment.reactions.length > 0 && (
				<div className="flex gap-1 pl-7">
					{comment.reactions.map((reaction) => (
						<span
							key={reaction.emoji}
							className="inline-flex h-5 items-center gap-1 rounded-full border bg-accent/50 px-1.5 text-[11px] tabular-nums"
						>
							<span className="text-xs leading-none">{reaction.emoji}</span>
							{reaction.count}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export interface FeedItem {
	comment: DemoComment;
	visible: boolean;
}

/**
 * A bottom-anchored comment feed, like a chat: each comment expands in
 * smoothly (grid-rows 0fr → 1fr) and pushes older ones up, where they fade
 * out under the top edge. The feed's height never changes.
 */
export function CommentFeed({ items, className }: { items: FeedItem[]; className?: string }) {
	return (
		<ul
			className={cn(
				"flex flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%)]",
				className
			)}
		>
			{items.map(({ comment, visible }) => (
				<li
					key={comment.id}
					aria-hidden={!visible}
					className="grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none"
					style={{ gridTemplateRows: visible ? "1fr" : "0fr", opacity: visible ? 1 : 0 }}
				>
					<div className="min-h-0 overflow-hidden">
						<div className="pt-2">
							<Comment comment={comment} />
						</div>
					</div>
				</li>
			))}
		</ul>
	);
}
