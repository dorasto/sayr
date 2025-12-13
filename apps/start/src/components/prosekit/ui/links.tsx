/** biome-ignore-all lint/a11y/useAnchorContent: required for custom link rendering */

import { Preview } from "@repo/ui/components/doras-ui/preview";
import type { ReactMarkViewProps } from "prosekit/react";
export default function Link(props: ReactMarkViewProps) {
	const href = props.mark.attrs.href as string;
	const isEditable = props.view.editable;

	const content = (
		<a
			href={href}
			className="text-primary hover:underline"
			ref={props.contentRef}
		/>
	);

	// if (isEditable) {
	// 	return content;
	// }

	return <Preview url={href}>{content}</Preview>;
}
