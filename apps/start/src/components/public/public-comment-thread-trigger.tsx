import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, getDisplayName, getInitials } from "@repo/util";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { CommentData } from "./public-comments-types";

const MAX_VISIBLE_AVATARS = 3;

interface PublicCommentThreadTriggerProps {
	replyCount: number;
	replyAuthors?: CommentData["replyAuthors"];
	expanded: boolean;
	onToggle: () => void;
}

/**
 * Collapsed thread trigger — rendered inside the parent comment's footer.
 * Shows "N replies" with overlapping avatars of unique reply authors.
 */
export function PublicCommentThreadTrigger({
	replyCount,
	replyAuthors,
	expanded,
	onToggle,
}: PublicCommentThreadTriggerProps) {
	if (replyCount === 0 && !expanded) return null;

	const visibleAuthors = (replyAuthors ?? []).slice(0, MAX_VISIBLE_AVATARS);
	const overflowCount = (replyAuthors ?? []).length - MAX_VISIBLE_AVATARS;

	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={expanded}
			className="mt-2 flex min-h-8 w-fit max-md:min-h-11 cursor-pointer items-center gap-2 rounded-full pr-2 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground"
		>
			{expanded ? (
				<IconChevronUp aria-hidden className="size-3.5" />
			) : (
				<IconChevronDown aria-hidden className="size-3.5" />
			)}
			{!expanded && visibleAuthors.length > 0 && (
				<span className="flex items-center -space-x-1.5">
					{visibleAuthors.map((author) => (
						<Avatar key={author.id} className="size-5 border-2 border-sidebar">
							{author.image ? (
								<AvatarImage src={ensureCdnUrl(author.image)} alt={getDisplayName(author)} />
							) : null}
							<AvatarFallback className="text-xs font-semibold">
								{getInitials(getDisplayName(author))}
							</AvatarFallback>
						</Avatar>
					))}
					{overflowCount > 0 && (
						<span className="flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-sidebar bg-muted px-1 font-medium text-muted-foreground text-xs">
							+{overflowCount}
						</span>
					)}
				</span>
			)}
			<span>
				{expanded ? "Hide" : replyCount} {replyCount === 1 ? "reply" : "replies"}
			</span>
		</button>
	);
}
