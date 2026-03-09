import { defineBasicExtension } from "prosekit/basic";
import { union } from "prosekit/core";
import { defineCodeBlock, defineCodeBlockShiki } from "prosekit/extensions/code-block";
import { defineImage } from "prosekit/extensions/image";
import { defineMention } from "prosekit/extensions/mention";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { defineReadonly } from "prosekit/extensions/readonly";
import { defineReactMarkView } from "prosekit/react";
import type { EditorState } from "prosekit/pm/state";
import Link from "../ui/links";
import { defineGif } from "./gif-extension";
import { defineTemplatePlaceholder, defineTemplatePlaceholderClickHandler } from "./placeholder-node-extension";
import { defineVideo } from "./video-extension";

export function defineExtension({
	readonly = false,
	placeholder = "Press / for commands...",
	firstLinePlaceholder,
	hasTemplate = false,
}: {
	readonly?: boolean;
	placeholder?: string;
	firstLinePlaceholder?: string;
	hasTemplate?: boolean;
} = {}) {
	// Create placeholder function that shows different text for first line
	const placeholderFn = firstLinePlaceholder
		? (state: EditorState) => {
				// Get the current selection position
				const { $from } = state.selection;
				// Check if cursor is in the first block (first child of doc)
				// $from.depth tells us how deep we are, and we check if the parent index is 0
				const isFirstBlock = $from.depth >= 1 && $from.index($from.depth - 1) === 0;
				return isFirstBlock ? firstLinePlaceholder : placeholder;
			}
		: placeholder;

	const extensions = [
		defineBasicExtension(),
		definePlaceholder({ placeholder: placeholderFn }),
		defineCodeBlock(),
		defineCodeBlockShiki(),
		defineMention(),
		defineImage(),
		defineReactMarkView({
			name: "link",
			component: Link,
		}),
		defineVideo(),
		defineGif(),
		defineTemplatePlaceholder(),
		...(hasTemplate ? [defineTemplatePlaceholderClickHandler()] : []),
	];

	if (readonly) {
		extensions.push(defineReadonly());
	}

	return union(extensions);
}

export type EditorExtension = ReturnType<typeof defineExtension>;
