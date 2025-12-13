import { defineBasicExtension } from "prosekit/basic";
import { union } from "prosekit/core";
import {
	defineCodeBlock,
	defineCodeBlockShiki,
} from "prosekit/extensions/code-block";
import { defineImage } from "prosekit/extensions/image";
import { defineMention } from "prosekit/extensions/mention";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { defineReadonly } from "prosekit/extensions/readonly";

export function defineExtension({
	readonly = false,
}: {
	readonly?: boolean;
} = {}) {
	const extensions = [
		defineBasicExtension(),
		definePlaceholder({ placeholder: "Press / for commands..." }),
		defineCodeBlock(),
		defineCodeBlockShiki(),
		defineMention(),
		defineImage(),
	];

	if (readonly) {
		extensions.push(defineReadonly());
	}

	return union(extensions);
}

export type EditorExtension = ReturnType<typeof defineExtension>;
