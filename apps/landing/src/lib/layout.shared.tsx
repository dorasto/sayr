import TasqIcon from "@repo/ui/components/brand-icon";
import { IconApi, IconBook2, IconCode, IconHelpCircle } from "@tabler/icons-react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout options between the docs layout and any other places that
 * need Fumadocs UI (e.g. a search dialog outside `/docs`). Mirrors
 * apps/marketing's 3-topic sidebar (Documentation / API / Knowledge Base),
 * plus a 4th "Contributing" tab split out from Documentation — see
 * astro.config.mjs's `starlightSidebarTopics` for the 3-topic source of
 * truth this was ported from.
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<>
					<TasqIcon size={22} /> Sayr
				</>
			),
			url: "/",
			transparentMode: "top",
		},
		githubUrl: "https://github.com/dorasto/sayr",
	};
}

export const docsTabs = [
	{
		title: "Documentation",
		description: "Guides and references",
		url: "/docs",
		icon: <IconBook2 size={16} />,
	},
	{
		title: "API",
		description: "REST API reference",
		// content/docs/api has no index page (mirrors astro.config.mjs's own
		// `link: "/docs/api/overview/"`) — point the tab at the real first page
		// instead of the bare folder, which 404s.
		url: "/docs/api/overview",
		icon: <IconApi size={16} />,
	},
	{
		title: "Knowledge Base",
		// short enough to fit on one line in the tab dropdown at typical
		// sidebar widths — "Common questions answered" wraps to two.
		description: "FAQs and guides",
		url: "/docs/knowledge-base",
		icon: <IconHelpCircle size={16} />,
	},
	{
		title: "Contributing",
		description: "Contribute to Sayr",
		// content/docs/contributing has no index page — land on the setup guide.
		url: "/docs/contributing/local-development",
		icon: <IconCode size={16} />,
	},
];
