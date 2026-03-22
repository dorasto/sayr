/**
 * This file contains all SEO-related constants and helpers for the application.
 * Based on TanStack Start best practices for meta tags and Open Graph.
 */

export const SITE_CONFIG = {
  name: "Sayr",
  url: "https://sayr.io",

  description:
    "Project management and collaboration between developers, teams, and the public.",
  ogImage: "/web-app-manifest-192x192.png", // Add your OG image path
  twitterHandle: "@sayr", // Update with your Twitter handle
  author: "Doras Media Limited",
  locale: "en_US",
  type: "website",
} as const;

export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/dorasui",
  github: "https://github.com/dorasto/sayr",
  discord: "https://sayr.io/discord",
} as const;

/**
 * Generate structured data (JSON-LD) for better SEO
 */
export const generateStructuredData = ({
  type = "WebSite",
  name,
  description,
  url,
}: {
  type?: "WebSite" | "WebPage" | "SoftwareApplication" | "Organization";
  name: string;
  description?: string;
  url?: string;
}) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    ...(description && { description }),
    ...(url && { url }),
  };

  if (type === "WebSite") {
    return {
      ...baseData,
      url: SITE_CONFIG.url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_CONFIG.url}/blocks?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }

  if (type === "SoftwareApplication") {
    return {
      ...baseData,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    };
  }

  return baseData;
};

/**
 * Breadcrumb schema generator
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>,
) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.url}${item.url}`,
    })),
  };
};

/**
 * Component schema for individual components
 */
export const generateComponentSchema = ({
  name,
  description,
  category,
}: {
  name: string;
  description: string;
  category: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name,
    description,
    programmingLanguage: "TypeScript",
    runtimePlatform: "React",
    codeRepository: SOCIAL_LINKS.github,
    keywords: [name, category, "React", "TanStack Router", "UI Component"],
  };
};

/**
 * Default keywords for all pages
 */
export const DEFAULT_KEYWORDS = [
  "React",
  "TanStack Router",
  "UI Components",
  "Component Library",
  "TypeScript",
  "Tailwind CSS",
  "shadcn",
  "Accessible Components",
  "Modern UI",
  "Web Development",
] as const;

/**
 * Build an absolute URL for the /api/og dynamic OG image endpoint.
 *
 * All params are optional — omit any you don't have and the image will
 * gracefully fall back to Sayr branding.
 *
 * @example
 * // Task page
 * getOgImageUrl({ title: task.title, subtitle: `#${task.shortId}`, meta: org.name, logo: org.logo })
 *
 * // Org page
 * getOgImageUrl({ title: org.name, subtitle: "Organization", logo: org.logo })
 *
 * // Generic / static page
 * getOgImageUrl({ title: "Pricing" })
 *
 * // Default Sayr branded card
 * getOgImageUrl()
 */
export const getOgImageUrl = (params?: {
	/**
	 * Layout type:
	 * - "detailed" (default) — org logo + meta row, large title, subtitle. For entity pages (tasks, release detail).
	 * - "simple" — large title + optional context line only. For list/section/admin pages.
	 */
	type?: "detailed" | "simple";
	/** Main large text — the task/release/page title */
	title?: string;
	/** Smaller line below the title — e.g. "#42", a status, or "Sayr Admin" */
	subtitle?: string;
	/** Label shown next to the logo — typically the org name. Detailed only. */
	meta?: string;
	/** Absolute URL of an image (org logo, etc.). Detailed: small circle in org row. Simple: large square on right side. */
	logo?: string;
	/**
	 * Optional task status counts for the detailed layout.
	 * Renders a horizontal row of coloured status pills below the subtitle.
	 * Only statuses with count > 0 are shown.
	 *
	 * @example
	 * stats: [{ status: "done", count: 5 }, { status: "in-progress", count: 2 }]
	 */
	stats?: Array<{ status: string; count: number }>;
}): string => {
	// Use VITE_URL_ROOT so this works correctly in dev (localhost:3000),
	// staging, and production — not the hardcoded SITE_CONFIG.url.
	const base = import.meta.env.VITE_URL_ROOT || SITE_CONFIG.url;
	const url = new URL(`${base}/api/og`);
	if (params?.type && params.type !== "detailed") url.searchParams.set("type", params.type);
	if (params?.title) url.searchParams.set("title", params.title);
	if (params?.subtitle) url.searchParams.set("subtitle", params.subtitle);
	if (params?.meta) url.searchParams.set("meta", params.meta);
	if (params?.logo) url.searchParams.set("logo", params.logo);
	if (params?.stats && params.stats.length > 0) {
		url.searchParams.set("stats", JSON.stringify(params.stats));
	}
	return url.toString();
};

/**
 * Generate a canonical URL
 */
export const getCanonicalUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_CONFIG.url}${cleanPath}`;
};
/**
 * SEO helper for TanStack Router
 */
export const seo = ({
  title,
  description,
  keywords,
  image,
  url,
}: {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}) => {
  const metaTitle = title ? `${title} | ${SITE_CONFIG.name}` : SITE_CONFIG.name;
  const metaURL = url || SITE_CONFIG.url;
  const metaDescription = description || SITE_CONFIG.description;
  const metaKeywords = keywords || DEFAULT_KEYWORDS.join(", ");
  const metaImage = image || SITE_CONFIG.ogImage;

  return [
    { title: metaTitle },
    { name: "description", content: metaDescription },
    { name: "keywords", content: metaKeywords },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: SITE_CONFIG.twitterHandle },
    { name: "twitter:creator", content: SITE_CONFIG.twitterHandle },
    { name: "twitter:title", content: metaTitle },
    { name: "twitter:description", content: metaDescription },
    { name: "twitter:image", content: metaImage },
    { name: "twitter:url", content: metaURL },
    { property: "og:type", content: "website" },
    { property: "og:title", content: metaTitle },
    { property: "og:description", content: metaDescription },
    { property: "og:site_name", content: SITE_CONFIG.name },
    { property: "og:image", content: metaImage },
    { property: "og:url", content: metaURL },
  ];
};
