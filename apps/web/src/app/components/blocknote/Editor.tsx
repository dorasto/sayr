"use client";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import { GridSuggestionMenuController, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./style.css";
import { type BlockNoteEditor, BlockNoteSchema, createCodeBlockSpec, type PartialBlock } from "@blocknote/core";
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
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createHighlighter } from "../../shiki.bundle";
import { CustomSlashMenu } from "./CustomSlashMenu";
import { CustomEmojiPicker } from "./custom/emoji";
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
	getSlashMenuItems?: (editor: BlockNoteEditor, query: string) => Promise<DefaultReactSuggestionItem[]>;
};

// Our <Editor> component we can reuse later
export default function Editor({
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
}: EditorProps) {
	const { theme } = useTheme();
	const [initialContent, setInitialContent] = useState<PartialBlock[] | undefined>(value);
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
							themes: [theme === "dark" ? "github-dark-default" : "github-light-default"],
							langs: [],
						}),
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
			theme={theme === "dark" ? "dark" : "light"}
			sideMenu={false}
			className=""
			data-theming-readonly={readonly ? "true" : "false"}
			editable={!readonly}
			slashMenu={false}
			emojiPicker={false}
			linkToolbar={true}
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
		</BlockNoteView>
	);
}
