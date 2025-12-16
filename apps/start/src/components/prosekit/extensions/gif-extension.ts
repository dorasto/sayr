import { defineNodeSpec, union } from "prosekit/core";
import { defineReactNodeView } from "prosekit/react";
import GifView from "../ui/gif-view";

function defineGifSpec() {
	return defineNodeSpec({
		name: "gif",
		group: "block",
		atom: true,
		draggable: true,
		selectable: true,
		attrs: {
			src: { default: null },
			width: { default: null },
			height: { default: null },
		},
		parseDOM: [{ tag: "gif" }],
		toDOM: (node) => [
			"gif",
			{
				src: node.attrs.src,
				width: node.attrs.width,
				height: node.attrs.height,
			},
		],
	});
}

export function defineGif() {
	return union(
		defineGifSpec(),
		defineReactNodeView({
			name: "gif",
			component: GifView,
		})
	);
}
