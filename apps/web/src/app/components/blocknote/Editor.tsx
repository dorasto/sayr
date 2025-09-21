"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./style.css";
import type { PartialBlock } from "@blocknote/core";
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
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
};

// Our <Editor> component we can reuse later
export default function Editor({
	language = "en",
	placeholder,
	placeholders,
	value,
	onChange,
	updateContent,
	readonly,
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
			...placeholders,
		},
	};

	// Creates a new editor instance.
	const editor = useCreateBlockNote({
		trailingBlock: false,
		initialContent: initialContent,
		dictionary: customDictionary,
		domAttributes: {
			block: {
				class: "test",
			},
		},
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
		></BlockNoteView>
	);
}
