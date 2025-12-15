import { Skeleton } from "@repo/ui/components/skeleton";
import type { BasicExtension } from "prosekit/basic";
import type { Union } from "prosekit/core";
import type { MentionExtension } from "prosekit/extensions/mention";
import { useEditor } from "prosekit/react";
import {
	AutocompleteEmpty,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopover,
} from "prosekit/react/autocomplete";

// Match inputs like "#", "#foo", "#foo_bar", etc.
const regex = /#[\da-z_]*$/i;

export default function TagMenu(props: {
	tags: { id: number; label: string }[];
	loading?: boolean;
	onQueryChange?: (query: string) => void;
	onOpenChange?: (open: boolean) => void;
}) {
	const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

	const handleTagInsert = (id: number, label: string) => {
		editor.commands.insertMention({
			id: id.toString(),
			value: `#${label}`,
			kind: "tag",
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

				{props.tags.map((tag) => (
					<AutocompleteItem
						key={tag.id}
						className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
						onSelect={() => handleTagInsert(tag.id, tag.label)}
					>
						{props.loading ? (
							<Skeleton className="w-full" />
						) : (
							<span className="text-sm font-medium">#{tag.label}</span>
						)}
					</AutocompleteItem>
				))}
			</AutocompleteList>
		</AutocompletePopover>
	);
}
