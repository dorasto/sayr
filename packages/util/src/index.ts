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
 * Extracts the raw HSL values from an HSLA or HSL color string.
 *
 * @param hslaColor - An HSLA or HSL color string (e.g., "hsla(209, 100%, 50%, 1)" or "hsl(209, 100%, 50%)")
 * @returns The raw HSL values without the function wrapper (e.g., "209, 100%, 50%")
 *
 * @example
 * ```ts
 * const rawHsl = extractHslValues("hsla(209, 100%, 50%, 1)");
 * // "209, 100%, 50%"
 *
 * const rawHsl2 = extractHslValues("hsl(120, 80%, 60%)");
 * // "120, 80%, 60%"
 * ```
 */
export function extractHslValues(hslaColor: string): string {
	if (!hslaColor) {
		return "";
	}

	// Match hsla(h, s%, l%, a) or hsl(h, s%, l%)
	const match = hslaColor.match(/hsla?\(([^)]+)\)/);
	if (!match || !match[1]) {
		return hslaColor;
	}

	// Extract all values and remove the alpha if present
	const values = match[1].split(",").map((v) => v.trim());

	// Return only the first 3 values (h, s, l) without alpha
	return values.slice(0, 3).join(", ");
}

/**
 * Converts an HSLA color string to a new HSLA color with the specified opacity.
 *
 * @param hslaColor - An HSLA color string (e.g., "hsla(193, 100%, 50%, 1)")
 * @param opacity - The desired opacity value (0-1)
 * @returns A new HSLA color string with the updated opacity
 *
 * @example
 * ```ts
 * const lightBlue = getHslaWithOpacity("hsla(193, 100%, 50%, 1)", 0.1);
 * // "hsla(193, 100%, 50%, 0.1)"
 *
 * const semiTransparent = getHslaWithOpacity("hsla(0, 80%, 60%, 1)", 0.5);
 * // "hsla(0, 80%, 60%, 0.5)"
 * ```
 */
export function getHslaWithOpacity(hslaColor: string, opacity: number): string {
	if (!hslaColor || !hslaColor.startsWith("hsla(")) {
		return hslaColor;
	}

	// Replace the alpha value with the new opacity
	return hslaColor.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
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
export function formatDateTimeFromNow(date: Date | string, locale = "en-US"): string {
	// Convert input to Date object if it's a string, otherwise use as-is
	const d = typeof date === "string" ? new Date(date) : date;

	// Get current timestamp for comparison
	const now = new Date();

	// Calculate time difference in milliseconds between now and the input date
	const diffInMs = now.getTime() - d.getTime();

	// Convert milliseconds to minutes by dividing by (1000ms * 60s) and rounding down
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

	// Convert milliseconds to hours by dividing by (1000ms * 60s * 60m) and rounding down
	const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

	// Convert milliseconds to days by dividing by (1000ms * 60s * 60m * 24h) and rounding down
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	// Handle very recent times (less than 5 minutes ago)
	if (diffInMinutes < 5) {
		return "just now";
	}
	// Handle recent times (5-59 minutes ago) with proper pluralization
	else if (diffInMinutes < 60) {
		// Use ternary operator to add 's' for plural, nothing for singular
		return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
	}
	// Handle times within the last 24 hours (1-23 hours ago) with proper pluralization
	else if (diffInHours < 24) {
		// Use ternary operator to add 's' for plural, nothing for singular
		return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
	}
	// Handle times within the last week (1-6 days ago) with proper pluralization
	else if (diffInDays < 7) {
		// Use ternary operator to add 's' for plural, nothing for singular
		return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
	}
	// For times older than 1 week, fall back to compact date formatting
	else {
		return formatDateCompact(d, locale);
	}
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

/**
 * Parse a channel string of format "key:value;key:value"
 * into an object.
 *
 * Handles single-word channels like "admin" gracefully.
 *
 * @example
 * parseChannel("project:123;task:456")
 * // { project: "123", task: "456" }
 *
 * @example
 * parseChannel("admin")
 * // { channel: "admin" }
 */
export function parseChannel(channel: string): Record<string, string> {
	const trimmed = channel.trim();
	if (!trimmed) return {};

	// Handle simple channel with no ":" or ";"
	if (!trimmed.includes(":") && !trimmed.includes(";")) {
		return { channel: trimmed };
	}

	// Parse "key:value;key:value" format
	return trimmed.split(";").reduce<Record<string, string>>((acc, part) => {
		const [key, value] = part.split(":");
		if (key && value) {
			acc[key.trim()] = value.trim();
		}
		return acc;
	}, {});
}
