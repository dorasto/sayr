import TasqIcon from "@repo/ui/components/brand-icon";
import { IconApi, IconBook2, IconCode, IconHelpCircle } from "@tabler/icons-react";
import type * as PageTree from "fumadocs-core/page-tree";
import { flattenTree } from "fumadocs-core/page-tree";
import type { BaseLayoutProps, LayoutTab } from "fumadocs-ui/layouts/shared";

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

/**
 * Every page under `prefix` (itself included), read off the live page tree.
 *
 * Without this, fumadocs falls back to `pathname.startsWith(tab.url + "/")`
 * for active-tab detection — which only matches pages nested under the tab's
 * literal `url`. Since none of these folders have an index page, `url` points
 * at a specific child page (e.g. `/docs/api/overview`) rather than the bare
 * folder, so that fallback only ever matched *that one page*: every sibling
 * (`/docs/api/sdk`, any `/docs/api/reference/**`, ...) fell through and the
 * dropdown silently reported "Documentation" instead. An explicit `urls` set
 * bypasses that prefix check entirely and stays correct as pages are added or
 * removed, since it's computed from the real tree rather than hand-maintained.
 */
function urlsUnder(tree: PageTree.Root, prefix: string): Set<string> {
	// Folders left out of a parent meta.json's `pages` allowlist (api/,
	// knowledge-base/ — see content/docs/meta.json) don't appear in `tree.children`
	// at all; fumadocs stows them in `tree.fallback` instead. Both need walking or
	// their pages are invisible to this helper entirely.
	const nodes = tree.fallback ? [...tree.children, ...tree.fallback.children] : tree.children;
	return new Set(
		flattenTree(nodes)
			.map((page) => page.url)
			.filter((url) => url === prefix || url.startsWith(`${prefix}/`))
	);
}

export function getDocsTabs(tree: PageTree.Root): LayoutTab[] {
	return [
		{
			title: "Documentation",
			description: "Guides and references",
			// No `urls` here — this is the catch-all for everything not claimed by
			// a more specific tab below, via the plain `pathname.startsWith` fallback.
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
			urls: urlsUnder(tree, "/docs/api"),
		},
		{
			title: "Knowledge Base",
			// short enough to fit on one line in the tab dropdown at typical
			// sidebar widths — "Common questions answered" wraps to two.
			description: "FAQs and guides",
			url: "/docs/knowledge-base",
			icon: <IconHelpCircle size={16} />,
			urls: urlsUnder(tree, "/docs/knowledge-base"),
		},
		{
			title: "Contributing",
			description: "Contribute to Sayr",
			// content/docs/contributing has no index page — land on the setup guide.
			url: "/docs/contributing/local-development",
			icon: <IconCode size={16} />,
			urls: urlsUnder(tree, "/docs/contributing"),
		},
	];
}
