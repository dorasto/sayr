import { AutocompleteList, AutocompletePopover } from "prosekit/react/autocomplete";
import type { BasicExtension } from "prosekit/basic";
import { canUseRegexLookbehind } from "prosekit/core";
import { handleMediaUpload } from "../utils/uploadMedia";
import SlashMenuEmpty from "./slash-menu-empty";
import SlashMenuItem from "./slash-menu-item";
import {
	IconCode,
	IconLibraryPhoto,
	IconH1,
	IconH2,
	IconH3,
	IconLetterCase,
	IconLineDashed,
	IconList,
	IconListCheck,
	IconListDetails,
	IconListNumbers,
	IconPhoto,
	IconQuote,
	IconTable,
	IconVideo,
} from "@tabler/icons-react";
import { useEditor } from "prosekit/react";

// Match inputs like "/", "/table", "/heading 1" etc. Do not match "/ heading".
const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

export default function SlashMenu() {
	const editor = useEditor<BasicExtension>();

	return (
		<AutocompletePopover
			regex={regex}
			className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-lg border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
		>
			<AutocompleteList>
				<SlashMenuItem
					label="Text"
					icon={<IconLetterCase className="size-4" />}
					onSelect={() => editor.commands.setParagraph()}
				/>

				<SlashMenuItem
					label="Heading 1"
					icon={<IconH1 className="size-4" />}
					kbd="#"
					onSelect={() => editor.commands.setHeading({ level: 1 })}
				/>

				<SlashMenuItem
					label="Heading 2"
					icon={<IconH2 className="size-4" />}
					kbd="##"
					onSelect={() => editor.commands.setHeading({ level: 2 })}
				/>

				<SlashMenuItem
					label="Heading 3"
					icon={<IconH3 className="size-4" />}
					kbd="###"
					onSelect={() => editor.commands.setHeading({ level: 3 })}
				/>

				<SlashMenuItem
					label="Bullet list"
					kbd="-"
					icon={<IconList className="size-4" />}
					onSelect={() => editor.commands.wrapInList({ kind: "bullet" })}
				/>

				<SlashMenuItem
					label="Ordered list"
					kbd="1."
					icon={<IconListNumbers className="size-4" />}
					onSelect={() => editor.commands.wrapInList({ kind: "ordered" })}
				/>

				<SlashMenuItem
					label="Task list"
					kbd="[]"
					icon={<IconListCheck className="size-4" />}
					onSelect={() => editor.commands.wrapInList({ kind: "task" })}
				/>

				<SlashMenuItem
					label="Toggle list"
					kbd=">>"
					icon={<IconListDetails className="size-4" />}
					onSelect={() => editor.commands.wrapInList({ kind: "toggle" })}
				/>

				<SlashMenuItem
					label="Quote"
					kbd=">"
					icon={<IconQuote className="size-4" />}
					onSelect={() => editor.commands.setBlockquote()}
				/>

				<SlashMenuItem
					label="Table"
					icon={<IconTable className="size-4" />}
					onSelect={() => editor.commands.insertTable({ row: 3, col: 3 })}
				/>

				<SlashMenuItem
					label="Divider"
					kbd="---"
					icon={<IconLineDashed className="size-4" />}
					onSelect={() => editor.commands.insertHorizontalRule()}
				/>

				<SlashMenuItem
					label="Code"
					kbd="```"
					icon={<IconCode className="size-4" />}
					onSelect={() => editor.commands.setCodeBlock()}
				/>

				<SlashMenuItem
					label="Image"
					icon={<IconPhoto className="size-4" />}
					onSelect={() => handleMediaUpload(editor, "image")}
				/>

				<SlashMenuItem
					label="Video"
					icon={<IconVideo className="size-4" />}
					onSelect={() => handleMediaUpload(editor, "video")}
				/>

				{import.meta.env.VITE_TENOR_API && (
					<SlashMenuItem
						label="GIF"
						icon={<IconLibraryPhoto className="size-4" />}
						onSelect={() => handleMediaUpload(editor, "gif")}
					/>
				)}

				<SlashMenuEmpty />
			</AutocompleteList>
		</AutocompletePopover>
	);
}
