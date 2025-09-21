/**
 * Extracts the file name (last path segment) from a given URL or path.
 *
 * @param url - A full URL or path string.
 * @returns The last segment of the path (the file name), or an empty string if none found.
 *
 * @example
 * ```ts
 * const fileName1 = getFileNameFromUrl("https://cdn.example.com/org/123/logo.png");
 * // "logo.png"
 *
 * const fileName2 = getFileNameFromUrl("organization/123/banner.webp");
 * // "banner.webp"
 * ```
 */
export function getFileNameFromUrl(url: string): string {
	return url.split("/").pop() || "";
}

/**
 * Ensures a file path or URL has the correct CDN base URL.
 *
 * - If the string already starts with `cdnBase` or an absolute URL, returns it unchanged.
 * - If it's a relative path, prepends the configured CDN base.
 *
 * @param pathOrUrl - A relative path or full URL to normalize.
 * @param cdnBase - The CDN base URL to prepend (defaults to `process.env.FILE_CDN`).
 * @returns A properly formatted absolute CDN URL pointing to the resource.
 *
 * @example
 * ```ts
 * const url1 = ensureCdnUrl("organization/123/logo.png", "https://files.domain.com");
 * // "https://files.domain.com/organization/123/logo.png"
 *
 * const url2 = ensureCdnUrl("https://files.domain.com/organization/123/logo.png");
 * // "https://files.domain.com/organization/123/logo.png"
 * ```
 */
export function ensureCdnUrl(pathOrUrl: string, cdnBase = process.env.FILE_CDN || ""): string {
	if (!pathOrUrl) return "";

	// If already starts with CDN base or http(s) absolute URL → return as-is
	if (pathOrUrl.startsWith(cdnBase) || pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
		return pathOrUrl;
	}

	// Otherwise prepend CDN base
	return `${cdnBase.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
}

/**
 * Formats a Date object or string into a human-readable format.
 *
 * @param date - Date object or ISO string.
 * @param locale - Locale for formatting (default: "en-US").
 * @returns A formatted date string.
 *
 * @example
 * ```ts
 * const formatted = formatDate("2025-09-18T17:00:00Z");
 * // "Sep 18, 2025"
 * ```
 */
export function formatDate(date: Date | string, locale = "en-US"): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(date: Date | string, locale = "en-US"): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	});
}

/**
 * Converts a string into a clean, URL‑safe slug.
 *
 * - Lowercases all characters for consistency.
 * - Replaces spaces and non‑alphanumeric characters with hyphens (`-`).
 * - Trims any leading or trailing hyphens.
 *
 * Commonly used for generating slugs for projects, organizations,
 * or any entity that should be represented in a human‑readable URL.
 *
 * @param name - The input string to convert (e.g. `"Website Redesign 🚀"`).
 * @returns The slugified string containing only lowercase letters,
 * numbers, and hyphens.
 *
 * @example
 * ```ts
 * const slug1 = generateSlug("Website Redesign 🚀");
 * // "website-redesign"
 *
 * const slug2 = generateSlug("Acme v1.0 Beta");
 * // "acme-v1-0-beta"
 *
 * const slug3 = generateSlug("   Hello___World   ");
 * // "hello-world"
 * ```
 */
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-") // replace all non-alphanumeric with "-"
		.replace(/^-+|-+$/g, ""); // remove leading/trailing "-"
}

/**
 * Formats a Date object or string into a compact format with contextual year display.
 *
 * - For current year: "Sep 20"
 * - For other years: "Sep 20 2025"
 *
 * @param date - Date object or ISO string.
 * @param locale - Locale for formatting (default: "en-US").
 *
 * @example
 * ```ts
 * const today = formatDateCompact(new Date()); // "Sep 20" if current year
 * const oldDate = formatDateCompact("2023-09-18T17:00:00Z"); // "Sep 18 2023"
 * ```
 */
export function formatDateCompact(date: Date | string, locale = "en-US"): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const currentYear = new Date().getFullYear();
	const dateYear = d.getFullYear();

	if (dateYear === currentYear) {
		// Current year: "Sep 20"
		return `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
	} else {
		// Other years: "Sep 20 2025"
		return `${d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
	}
}
