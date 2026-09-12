// Shared page-metadata builder for TanStack Start's `head()` route option.
// Centralising this keeps every marketing/docs page's title, description,
// canonical link, and Open Graph / Twitter tags consistent instead of each
// route hand-rolling its own `meta` array.

export const SITE_URL = "https://sayr.io";
export const SITE_NAME = "Sayr";

interface SeoOptions {
	/** Page title, without the " - Sayr" suffix — this helper appends it. */
	title: string;
	description: string;
	/** Route path starting with "/", e.g. "/pricing", "/features/tasks". */
	path: string;
	/** Absolute image URL. Defaults to a title-based image from /api/og. */
	image?: string;
	type?: "website" | "article";
}

export function seoMeta({ title, description, path, image, type = "website" }: SeoOptions) {
	const fullTitle = title === SITE_NAME ? title : `${title} - ${SITE_NAME}`;
	const url = `${SITE_URL}${path}`;
	const ogImage = image ?? `${SITE_URL}/api/og?title=${encodeURIComponent(title)}`;

	return {
		meta: [
			{ title: fullTitle },
			{ name: "description", content: description },
			{ property: "og:type", content: type },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:title", content: fullTitle },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ property: "og:image", content: ogImage },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: fullTitle },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: ogImage },
		],
		links: [{ rel: "canonical", href: url }],
	};
}
