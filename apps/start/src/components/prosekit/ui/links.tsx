/** biome-ignore-all lint/a11y/useAnchorContent: required for custom link rendering */

import { Preview } from "@repo/ui/components/doras-ui/preview";
import type { ReactMarkViewProps } from "prosekit/react";

const normalizeUrl = (url: string): string => {
	// If URL doesn't start with a protocol, add https://
	if (!url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/)) {
		return `https://${url}`;
	}
	return url;
};

export default function Link(props: ReactMarkViewProps) {
	const href = props.mark.attrs.href as string;
	const isEditable = props.view.editable;
	const normalizedHref = normalizeUrl(href);

	const content = (
		<a href={normalizedHref} className="text-primary hover:underline" ref={props.contentRef} />
	);

	if (isEditable) {
		return content;
	}

	return (
		<Preview url={href} className=" pointer-events-auto!">
			{content}
		</Preview>
	);
}
