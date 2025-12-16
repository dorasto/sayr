import { defineBasicExtension } from "prosekit/basic";
import { union } from "prosekit/core";
import { defineCodeBlock, defineCodeBlockShiki } from "prosekit/extensions/code-block";
import { defineImage } from "prosekit/extensions/image";
import { defineMention } from "prosekit/extensions/mention";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { defineReadonly } from "prosekit/extensions/readonly";
import { defineReactMarkView } from "prosekit/react";
import Link from "../ui/links";
import { defineGif } from "./gif-extension";
import { defineVideo } from "./video-extension";

export function defineExtension({
	readonly = false,
	placeholder = "Press / for commands...",
}: {
	readonly?: boolean;
	placeholder?: string;
} = {}) {
	const extensions = [
		defineBasicExtension(),
		definePlaceholder({ placeholder }),
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
	];

	if (readonly) {
		extensions.push(defineReadonly());
	}

	return union(extensions);
}

export type EditorExtension = ReturnType<typeof defineExtension>;
