import { Skeleton } from "@repo/ui/components/skeleton";
import { getDisplayName } from "@repo/util";
import type { BasicExtension } from "prosekit/basic";
import { canUseRegexLookbehind, type Union } from "prosekit/core";
import type { MentionExtension } from "prosekit/extensions/mention";
import { useEditor } from "prosekit/react";
import {
	AutocompleteEmpty,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopover,
} from "prosekit/react/autocomplete";
import { useMemo, useState } from "react";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import type { schema } from "@repo/database";

// Match inputs like "@", "@foo", "@foo bar" etc. Do not match "@ foo".
const regex = canUseRegexLookbehind() ? /(?<!\S)@(\S.*)?$/u : /@(\S.*)?$/u;

export default function UserMenu(props: {
	users: schema.userType[];
	loading?: boolean;
	onQueryChange?: (query: string) => void;
	onOpenChange?: (open: boolean) => void;
}) {
	const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();
	const [query, setQuery] = useState("");

	const handleQueryChange = (newQuery: string) => {
		setQuery(newQuery);
		props.onQueryChange?.(newQuery);
	};

	// Filter users by both username and displayName
	const filteredUsers = useMemo(() => {
		if (!query) return props.users;
		const lowerQuery = query.toLowerCase();
		return props.users.filter((user) => {
			const matchesName = user.name.toLowerCase().includes(lowerQuery);
			const matchesDisplayName = user.displayName?.toLowerCase().includes(lowerQuery);
			return matchesName || matchesDisplayName;
		});
	}, [props.users, query]);

	const handleUserInsert = (id: string, username: string) => {
		editor.commands.insertMention({
			id: id,
			value: `@${username}`,
			kind: "user",
		});
		editor.commands.insertText({ text: " " });
	};

	return (
		<AutocompletePopover
			regex={regex}
			className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-lg border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
			onQueryChange={handleQueryChange}
			onOpenChange={props.onOpenChange}
		>
			<AutocompleteList filter={null}>
				<AutocompleteEmpty className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden text-sm">
					{props.loading ? "Loading..." : "No results"}
				</AutocompleteEmpty>

				{filteredUsers.map((user) => {
					const displayName = getDisplayName(user);

					return (
						<AutocompleteItem
							key={user.id}
							className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
							onSelect={() => handleUserInsert(user.id, user.name)}
						>
							{props.loading ? (
								<Skeleton className="w-full" />
							) : (
								<div className="flex items-center gap-2">
									<InlineLabel
										className="text-sm ps-6"
										avatarClassName="size-4"
										text={displayName}
										image={user.image}
									/>
									<span className="text-xs text-muted-foreground">@{user.name}</span>
								</div>
							)}
						</AutocompleteItem>
					);
				})}
			</AutocompleteList>
		</AutocompletePopover>
	);
}
