"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { ExternalLink } from "lucide-react";

/**
 * Custom link renderer that adds an icon to links
 * This provides better visual feedback that something is a link
 */
export const CustomLink = createReactInlineContentSpec(
	{
		type: "link",
		propSchema: {
			href: {
				default: "",
			},
		},
		content: "styled",
	},
	{
		render: (props) => (
			<a
				href={props.inlineContent.props.href}
				target="_blank"
				rel="noopener noreferrer nofollow"
				className="bn-custom-link"
			>
				<ExternalLink className="bn-link-icon" size={14} />
				<span ref={props.contentRef} />
			</a>
		),
		// Parse HTML links when pasting or importing
		parse: (element) => {
			if (element.tagName === "A") {
				return {
					href: element.getAttribute("href") || "",
				};
			}
			return undefined;
		},
		// Export to HTML for clipboard and external use
		toExternalHTML: (props) => (
			<a href={props.inlineContent.props.href} target="_blank" rel="noopener noreferrer nofollow">
				<span ref={props.contentRef} />
			</a>
		),
	}
);
