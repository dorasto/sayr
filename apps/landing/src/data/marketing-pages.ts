/**
 * Marketing SEO pages (SAY-93): comparisons, alternatives, solutions,
 * integrations and guides. Each entry's body is MDX at
 * `content/pages/<section>/<slug>.mdx`; everything the page shell, <head>,
 * JSON-LD and sitemap need lives here, so it's typed and checked at build time
 * (the same split as `src/data/features.ts`).
 *
 * To add a page: write the MDX file, then add an entry below. Keep `updated`
 * honest; it's the sitemap's <lastmod> and the "Updated" line on the page.
 */

export const SECTIONS = {
	compare: {
		label: "Comparisons",
		title: "Sayr compared",
		description: "How Sayr compares with the trackers and feedback tools teams use today, feature by feature.",
	},
	alternatives: {
		label: "Alternatives",
		title: "Alternatives, compared honestly",
		description:
			"Looking for an alternative to your feedback board or tracker? What to look for, and where Sayr fits.",
	},
	solutions: {
		label: "Solutions",
		title: "Sayr for your team",
		description: "How teams use Sayr to run a public roadmap, collect feedback and ship in the open.",
	},
	integrations: {
		label: "Integrations",
		title: "Sayr integrations",
		description: "Connect Sayr to GitHub, Discord, your terminal and your own site.",
	},
	guides: {
		label: "Guides",
		title: "Guides and best practices",
		description: "Practical guides to public roadmaps, feedback triage, changelogs and building in public.",
	},
} as const;

export type SectionId = keyof typeof SECTIONS;

export function isSection(value: string): value is SectionId {
	return value in SECTIONS;
}

export interface MarketingPage {
	section: SectionId;
	/** URL segment and MDX filename (without .mdx). */
	slug: string;
	/** The <title>, without the " - Sayr" suffix. Aim for under ~60 characters. */
	title: string;
	/** Meta description. Aim for 140–160 characters. */
	description: string;
	/** The page's H1. */
	heading: string;
	/** One or two sentences under the H1. */
	subheading: string;
	/** Last meaningful content update, YYYY-MM-DD. */
	updated: string;
	/** Related pages as "section/slug", shown at the bottom. */
	related?: string[];
}

export const PAGES: MarketingPage[] = [
	{
		section: "compare",
		slug: "sayr-vs-canny",
		title: "Sayr vs Canny: feedback board and tracker in one",
		description:
			"Canny collects feedback and syncs it to your tracker. Sayr is the tracker, with a public board, roadmap and changelog built in. Compare features and pricing.",
		heading: "Sayr vs Canny",
		subheading:
			"Canny is a feedback board that syncs to the tracker your team works in. Sayr is that tracker, with the feedback board, roadmap and changelog built in.",
		updated: "2026-10-06",
	},
];

export function pagePath(page: Pick<MarketingPage, "section" | "slug">) {
	return `/${page.section}/${page.slug}`;
}

export function getPage(section: string, slug: string) {
	return PAGES.find((page) => page.section === section && page.slug === slug);
}

export function getSectionPages(section: SectionId) {
	return PAGES.filter((page) => page.section === section);
}

/** Resolves "section/slug" references, skipping any that don't exist. */
export function getRelatedPages(refs: string[] = []) {
	return refs.flatMap((ref) => {
		const [section, slug] = ref.split("/");
		const page = section && slug ? getPage(section, slug) : undefined;
		return page ? [page] : [];
	});
}
