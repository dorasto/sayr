import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

const MAX_VISIBLE_AVATARS = 3;

interface ReplyThreadTriggerProps {
	count: number;
	/** Unique reply/comment authors — up to 3 shown as overlapping avatars. */
	replyAuthors?: schema.UserSummary[];
	/** When true, styles the border to match an internal-visibility parent. */
	isInternal?: boolean;
	expanded?: boolean;
	onClick: () => void;
}

export function ReplyThreadTrigger({ count, replyAuthors, isInternal, expanded = false, onClick }: ReplyThreadTriggerProps) {
	if (count === 0) return null;

	const visibleAuthors = (replyAuthors ?? []).slice(0, MAX_VISIBLE_AVATARS);
	const overflowCount = (replyAuthors ?? []).length - MAX_VISIBLE_AVATARS;

	return (
		<button
			type="button"
			className={cn(
				"flex items-center gap-2 mt-2 pt-2 border-t w-full text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
				isInternal ? "border-primary/20" : "border-border/50",
			)}
			onClick={onClick}
		>
			{expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
			{!expanded && visibleAuthors.length > 0 && (
				<div className="flex items-center -space-x-1.5">
					{visibleAuthors.map((author) => {
						const name = getDisplayName(author);
						return (
							<Avatar key={author.id} className="size-5 border-2 border-background rounded-full">
								<AvatarImage src={author.image ?? ""} alt={name} />
								<AvatarFallback className="rounded-full bg-muted text-[8px] uppercase">
									{name.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
						);
					})}
					{overflowCount > 0 && (
						<div className="size-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
							+{overflowCount}
						</div>
					)}
				</div>
			)}
			<span>
				{expanded ? "Hide" : count} {count === 1 ? "reply" : "replies"}
			</span>
		</button>
	);
}
