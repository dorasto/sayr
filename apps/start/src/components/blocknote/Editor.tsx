import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import {
	FilePanelController,
	FormattingToolbar,
	FormattingToolbarController,
	GridSuggestionMenuController,
	getFormattingToolbarItems,
	SuggestionMenuController,
	useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./style.css";
import {
	type BlockNoteEditor,
	BlockNoteSchema,
	createCodeBlockSpec,
	createFileBlockSpec,
	type PartialBlock,
} from "@blocknote/core";
import {
	ar,
	de,
	en,
	es,
	fr,
	he,
	hr,
	is,
	it,
	ja,
	ko,
	nl,
	no,
	pl,
	pt,
	ru,
	sk,
	uk,
	vi,
	zh,
} from "@blocknote/core/locales";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { useStore } from "@tanstack/react-store";
import { type KeyboardEventHandler, useEffect, useState } from "react";
import { createHighlighter } from "@/lib/shiki.bundle";
import { themeStore } from "@/lib/theme-store";
import { CustomSlashMenu } from "./CustomSlashMenu";
import { CustomFilePanel } from "./custom/CustomFilePanel";
import { CustomEmojiPicker } from "./custom/emoji";
import { FileReplaceButton } from "./custom/FileReplaceButton";
import { getFilteredSlashMenuItems } from "./customSlashMenuItems";

// Create a mapping of supported locales
const localeMap = {
	en,
	fr,
	de,
	es,
	it,
	pt,
	nl,
	pl,
	ru,
	ja,
	ko,
	zh,
	ar,
	he,
	hr,
	is,
	no,
	sk,
	uk,
	vi,
	"zh-tw": zh, // Chinese Traditional uses same as simplified for now
} as const;

type EditorProps = {
	language?: keyof typeof localeMap;
	placeholder?: string;
	emptyDocumentPlaceholder?: string;
	trailing?: boolean;
	placeholders?: {
		default?: string;
		heading?: string;
		bulletListItem?: string;
		numberedListItem?: string;
		checkListItem?: string;
		new_comment?: string;
		edit_comment?: string;
		comment_reply?: string;
	};
	value?: PartialBlock[] | undefined;
	onChange?: (value: PartialBlock[]) => void;
	updateContent?: PartialBlock[] | undefined;
	readonly?: boolean;
	/**
	 * Optional function to provide custom slash menu items
	 * If not provided, the default slash menu items will be used
	 * @example
	 * getSlashMenuItems={async (editor, query) =>
	 *   filterSuggestionItems(getCustomSlashMenuItems(editor), query)
	 * }
	 */
	getSlashMenuItems?: (
		editor: BlockNoteEditor,
		query: string,
	) => Promise<DefaultReactSuggestionItem[]>;
	onKeyDown?: KeyboardEventHandler<HTMLDivElement> | undefined;
};

// Our <Editor> component we can reuse later
export function Editor({
	language = "en",
	placeholder,
	placeholders,
	emptyDocumentPlaceholder,
	value,
	onChange,
	updateContent,
	readonly,
	getSlashMenuItems,
	trailing = true,
	onKeyDown,
}: EditorProps) {
	const { theme } = useStore(themeStore);
	const [initialContent, setInitialContent] = useState<
		PartialBlock[] | undefined
	>(value);

	useEffect(() => {
		if (updateContent) {
			setInitialContent(updateContent);
		}
	}, [updateContent]);

	// Get the selected locale or fallback to English
	const selectedLocale = localeMap[language] || localeMap.en;

	// Create custom dictionary with placeholder overrides
	const customDictionary = {
		...selectedLocale,
		placeholders: {
			...selectedLocale.placeholders,
			...(placeholder && { default: placeholder }),
			emptyDocument: emptyDocumentPlaceholder,
			...placeholders,
		},
	};

	// Resolve actual theme (handle system theme)
	const resolvedTheme =
		theme === "system"
			? typeof window !== "undefined" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: theme;

	// Creates a new editor instance.
	const editor = useCreateBlockNote({
		schema: BlockNoteSchema.create().extend({
			blockSpecs: {
				codeBlock: createCodeBlockSpec({
					indentLineWithTab: true,

					defaultLanguage: "typescript",
					supportedLanguages: {
						typescript: {
							name: "TypeScript",
							aliases: ["ts"],
						},
						javascript: {
							name: "JavaScript",
							aliases: ["js"],
						},
						vue: {
							name: "Vue",
						},
					},
					// This creates a highlighter, it can be asynchronous to load it afterwards
					createHighlighter: () =>
						createHighlighter({
							themes: [
								resolvedTheme === "dark"
									? "github-dark-default"
									: "github-light-default",
							],
							langs: [],
						}),
				}),
				file: createFileBlockSpec({
					type: "file",
					propSchema: {
						name: { type: "string", default: "" },
						url: { type: "string", default: "" },
						type: { type: "string", default: "" },
					},
					filePanel: "default", // 👈 must match implicit controller key
				}),
			},
		}),
		trailingBlock: trailing,
		initialContent: initialContent,
		dictionary: customDictionary,
	});

	useEffect(() => {
		if (editor) {
			window.dispatchEvent(new CustomEvent("BlockNote-Editor-Ready"));
			editor.onChange(() => {
				onChange?.(editor.document);
			});
		}
	}, [editor, onChange]);

	// Renders the editor instance using a React component.
	return (
		<BlockNoteView
			data-theming-root
			editor={editor}
			theme={resolvedTheme === "dark" ? "dark" : "light"}
			sideMenu={false}
			className=""
			data-theming-readonly={readonly ? "true" : "false"}
			editable={!readonly}
			slashMenu={false}
			emojiPicker={false}
			linkToolbar={true}
			onKeyDown={onKeyDown}
			filePanel={false}
			formattingToolbar={false}
		>
			<GridSuggestionMenuController
				triggerCharacter={":"}
				gridSuggestionMenuComponent={CustomEmojiPicker}
				columns={6}
				minQueryLength={2}
			/>
			<SuggestionMenuController
				triggerCharacter={"/"}
				suggestionMenuComponent={CustomSlashMenu}
				getItems={async (query) => {
					// Use custom items if provided, otherwise use default reorganized items
					if (getSlashMenuItems) {
						return getSlashMenuItems(editor, query);
					}
					return getFilteredSlashMenuItems(editor, query);
				}}
			/>
			<FormattingToolbarController
				formattingToolbar={(props) => {
					const items = getFormattingToolbarItems();
					items.splice(
						items.findIndex((c) => c.key === "replaceFileButton"),
						1,
						<FileReplaceButton key={"fileReplaceButton"} />,
					);
					return <FormattingToolbar {...props}>{items}</FormattingToolbar>;
				}}
			/>
			<FilePanelController
				filePanel={(props) => <CustomFilePanel props={props} />}
			/>
		</BlockNoteView>
	);
}

export default Editor;
