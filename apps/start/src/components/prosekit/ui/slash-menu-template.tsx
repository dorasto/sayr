import { AutocompleteList, AutocompletePopover } from "prosekit/react/autocomplete";
import type { BasicExtension } from "prosekit/basic";
import { canUseRegexLookbehind } from "prosekit/core";
import { handleMediaUpload } from "../utils/uploadMedia";
import SlashMenuEmpty from "./slash-menu-empty";
import SlashMenuItem from "./slash-menu-item";
import { IconLibraryPhoto, IconPhoto, IconVideo } from "@tabler/icons-react";
import { useEditor } from "prosekit/react";
import { GifPickerModal } from "./GifPickerModal";
import { useState } from "react";

// Match inputs like "/", "/table", "/heading 1" etc. Do not match "/ heading".
const regex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

export default function SlashMenuTemplate() {
	const editor = useEditor<BasicExtension>();
	const [showGifPicker, setShowGifPicker] = useState(false);
	return (
		<>
			<AutocompletePopover
				regex={regex}
				className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-lg border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
			>
				<AutocompleteList>
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

					{import.meta.env.VITE_KLIPY_API && (
						<SlashMenuItem
							label="GIF"
							icon={<IconLibraryPhoto className="size-4" />}
							onSelect={() => setShowGifPicker(true)}
						/>
					)}

					<SlashMenuEmpty />
				</AutocompleteList>
			</AutocompletePopover>
			{import.meta.env.VITE_KLIPY_API && (
				<GifPickerModal editor={editor} open={showGifPicker} onOpenChange={setShowGifPicker} />
			)}
		</>
	);
}
