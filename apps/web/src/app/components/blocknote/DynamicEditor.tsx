"use client";

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

export const Editor = dynamic(() => import("./Editor"), { ssr: false }) as React.ComponentType<EditorProps>;
