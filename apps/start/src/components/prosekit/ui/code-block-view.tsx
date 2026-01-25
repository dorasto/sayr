import { defineReactNodeView, useExtension } from "prosekit/react";
import { useMemo } from "react";
import CodeBlockViewInner from "./code-block-view-inner";

export default function CodeBlockView() {
	const extension = useMemo(
		() =>
			defineReactNodeView({
				name: "codeBlock",
				component: CodeBlockViewInner,
			}),
		[]
	);

	useExtension(extension);
	return null;
}
