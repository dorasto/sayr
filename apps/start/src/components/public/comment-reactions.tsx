import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";

type ReactionMap = Record<string, { count: number; users: string[] }>;

function reactorsTitle(info: { count: number; users: string[] }, users?: schema.userType[]): string {
	const names = info.users
		.map((id) => users?.find((user) => user.id === id))
		.filter((user): user is schema.userType => !!user)
		.map((user) => getDisplayName(user));
	if (names.length === 0) return `${info.count} ${info.count === 1 ? "person" : "people"} reacted`;
	const shown = names.slice(0, 5).join(", ");
	return names.length > 5 ? `${shown} and ${names.length - 5} more` : shown;
}

interface CommentReactionsProps {
	reactions?: ReactionMap;
	onToggle?: (emoji: ReactionEmoji) => void;
	users?: schema.userType[];
	currentUserId?: string;
	className?: string;
}

/**
 * A comment's reaction chips (the admin `ReactionDisplay` look, primary-tinted when the viewer reacted). Adding a new
 * reaction is the hover-only `ReactionPicker` the comment renders after these chips. Omit `onToggle` when the viewer cannot react
 * (logged out, or public actions are off): chips render read-only.
 */
export function CommentReactions({ reactions, onToggle, users, currentUserId, className }: CommentReactionsProps) {
	const entries = Object.entries(reactions ?? {}).filter(([, info]) => info.count > 0);
	const reacted = (info: { users: string[] }) => !!currentUserId && info.users.includes(currentUserId);

	return (
		<div className={cn("flex flex-wrap items-center gap-1", className)}>
			{entries.map(([emoji, info]) =>
				onToggle ? (
					<button
						key={emoji}
						type="button"
						aria-pressed={reacted(info)}
						title={reactorsTitle(info, users)}
						onClick={() => onToggle(emoji as ReactionEmoji)}
						className={cn(
							"inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 font-medium text-xs transition-colors hover:bg-accent",
							reacted(info)
								? "border-primary/20 bg-primary/10 text-primary"
								: "border-border bg-accent/50 text-muted-foreground"
						)}
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</button>
				) : (
					<span
						key={emoji}
						title={reactorsTitle(info, users)}
						className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-accent/50 px-2 font-medium text-muted-foreground text-xs"
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</span>
				)
			)}
		</div>
	);
}
