import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
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
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";

// Match inputs like "@", "@foo", "@foo bar" etc. Do not match "@ foo".
const regex = canUseRegexLookbehind() ? /(?<!\S)@(\S.*)?$/u : /@(\S.*)?$/u;

export default function UserMenu(props: {
	users: { id: number; name: string; image?: string | null }[];
	loading?: boolean;
	onQueryChange?: (query: string) => void;
	onOpenChange?: (open: boolean) => void;
}) {
	const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

	const handleUserInsert = (id: number, username: string) => {
		editor.commands.insertMention({
			id: id.toString(),
			value: "@" + username,
			kind: "user",
		});
		editor.commands.insertText({ text: " " });
	};

	return (
		<AutocompletePopover
			regex={regex}
			className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-lg border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
			onQueryChange={props.onQueryChange}
			onOpenChange={props.onOpenChange}
		>
			<AutocompleteList>
				<AutocompleteEmpty className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden text-sm">
					{props.loading ? "Loading..." : "No results"}
				</AutocompleteEmpty>

				{props.users.map((user) => (
					<AutocompleteItem
						key={user.id}
						className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
						onSelect={() => handleUserInsert(user.id, user.name)}
					>
						{props.loading ? (
							<Skeleton className="w-full" />
						) : (
							<InlineLabel
								className="text-sm ps-6"
								avatarClassName="size-4"
								text={user.name}
								image={user.image}
							/>
						)}

						{/* <Label className={props.loading ? "opacity-50" : undefined}>
							{user.name}
						</Label> */}
					</AutocompleteItem>
				))}
			</AutocompleteList>
		</AutocompletePopover>
	);
}
