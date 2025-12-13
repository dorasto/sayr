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

const regex = /#[\da-z]*$/i;

export default function TagMenu(props: {
	tags: { id: number; label: string }[];
}) {
	const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

	const handleTagInsert = (id: number, label: string) => {
		editor.commands.insertMention({
			id: id.toString(),
			value: "#" + label,
			kind: "tag",
		});
		editor.commands.insertText({ text: " " });
	};

	return (
		<AutocompletePopover
			regex={regex}
			className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-10 box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg [&:not([data-state])]:hidden"
		>
			<AutocompleteList>
				<AutocompleteEmpty className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-gray-100 dark:data-focused:bg-gray-800">
					No results
				</AutocompleteEmpty>

				{props.tags.map((tag) => (
					<AutocompleteItem
						key={tag.id}
						className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-gray-100 dark:data-focused:bg-gray-800"
						onSelect={() => handleTagInsert(tag.id, tag.label)}
					>
						#{tag.label}
					</AutocompleteItem>
				))}
			</AutocompleteList>
		</AutocompletePopover>
	);
}
