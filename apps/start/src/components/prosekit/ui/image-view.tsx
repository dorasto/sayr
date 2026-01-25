import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import ImageViewInner from "./image-view-inner";

export default function ImageView() {
	const extension = useMemo(
		() =>
			defineReactNodeView({
				name: "image",
				component: ImageViewInner,
			}),
		[]
	);

	useExtension(extension);
	return null;
}
