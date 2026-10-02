import type { schema } from "@repo/database";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconMoodPlus } from "@tabler/icons-react";
import { useState } from "react";
import { REACTION_OPTIONS, type ReactionEmoji } from "@/components/tasks/task/timeline/reactions";

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
}

/**
 * Reaction chips for a comment (28px pills, primary-tinted when the viewer reacted) plus an add-reaction picker using
 * the same emoji set as everywhere else (`REACTION_OPTIONS`). Omit `onToggle` when the viewer cannot react (logged
 * out, or public actions are off): chips render read-only.
 */
export function CommentReactions({ reactions, onToggle, users, currentUserId }: CommentReactionsProps) {
	const [pickerOpen, setPickerOpen] = useState(false);

	const entries = Object.entries(reactions ?? {}).filter(([, info]) => info.count > 0);
	const reacted = (info: { users: string[] }) => !!currentUserId && info.users.includes(currentUserId);

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{entries.map(([emoji, info]) =>
				onToggle ? (
					<button
						key={emoji}
						type="button"
						aria-pressed={reacted(info)}
						title={reactorsTitle(info, users)}
						onClick={() => onToggle(emoji as ReactionEmoji)}
						className={cn(
							"relative inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-medium text-[12.5px] outline-none transition-colors",
							reacted(info)
								? "border-primary/50 bg-primary/15 text-primary"
								: "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
						)}
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</button>
				) : (
					<span
						key={emoji}
						title={reactorsTitle(info, users)}
						className="relative inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-medium text-[12.5px] outline-none transition-colors border-border text-muted-foreground"
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</span>
				)
			)}
			{onToggle && (
				<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
					<PopoverTrigger
						aria-label="Add reaction"
						className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-transparent text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
					>
						<IconMoodPlus aria-hidden className="size-4" />
					</PopoverTrigger>
					<PopoverContent className="w-auto p-1" align="start" sideOffset={4}>
						<div className="grid grid-cols-4 gap-1">
							{REACTION_OPTIONS.map(({ emoji, label }) => (
								<button
									key={emoji}
									type="button"
									aria-label={label}
									onClick={() => {
										onToggle(emoji);
										setPickerOpen(false);
									}}
									className={cn(
										"flex size-9 cursor-pointer items-center justify-center rounded-md text-lg max-md:size-11 transition-colors hover:bg-accent focus-visible:bg-accent",
										reacted(reactions?.[emoji] ?? { users: [] }) && "bg-accent"
									)}
								>
									{emoji}
								</button>
							))}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
