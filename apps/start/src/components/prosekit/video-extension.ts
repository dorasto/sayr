import { defineNodeSpec, union } from "prosekit/core";
import { defineReactNodeView } from "prosekit/react";
import VideoView from "./ui/VideoView";

function defineVideoSpec() {
	return defineNodeSpec({
		name: "video",
		group: "block",
		atom: true,
		draggable: true,
		selectable: true,
		attrs: {
			src: { default: null },
			width: { default: null },
			height: { default: null },
			controls: { default: true },
			autoplay: { default: false },
			loop: { default: false },
			muted: { default: false },
		},
		parseDOM: [{ tag: "video" }],
		toDOM: (node) => [
			"video",
			{
				src: node.attrs.src,
				controls: node.attrs.controls,
				autoplay: node.attrs.autoplay,
				loop: node.attrs.loop,
				muted: node.attrs.muted,
				width: node.attrs.width,
				height: node.attrs.height,
			},
		],
	});
}

export function defineVideo() {
	return union(defineVideoSpec(), defineReactNodeView({ name: "video", component: VideoView }));
}
