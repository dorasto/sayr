"use client";

import type { PartialBlock } from "@blocknote/core";
import dynamic from "next/dynamic";

// Define the props type that will be passed to the Editor
type EditorProps = {
	language?:
		| "en"
		| "fr"
		| "de"
		| "es"
		| "it"
		| "pt"
		| "nl"
		| "pl"
		| "ru"
		| "ja"
		| "ko"
		| "zh"
		| "ar"
		| "he"
		| "hr"
		| "is"
		| "no"
		| "sk"
		| "uk"
		| "vi"
		| "zh-tw";
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
};

export const Editor = dynamic(() => import("./Editor"), { ssr: false }) as React.ComponentType<EditorProps>;
