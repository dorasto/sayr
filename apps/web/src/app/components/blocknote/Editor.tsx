"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import { SideMenu, SideMenuController, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./style.css";
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
};

// Our <Editor> component we can reuse later
export default function Editor({ language = "en", placeholder, placeholders }: EditorProps) {
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
		dictionary: customDictionary,

		domAttributes: {
			block: {
				class: "test",
			},
		},
	});

	// Renders the editor instance using a React component.
	return <BlockNoteView data-theming-root editor={editor} sideMenu={false} className=""></BlockNoteView>;
}
