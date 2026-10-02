const SAFE_LINK_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:", "mailto:"]);

/**
 * Whether an editor link target may be stored or followed: only absolute `http:`, `https:` and `mailto:` URLs. Anything
 * that does not parse (including scheme-less text) or uses another scheme (`javascript:`, `data:`, `vbscript:` ...) is
 * rejected. Leading/trailing whitespace is ignored; the URL parser strips embedded tabs and newlines itself.
 */
export function isSafeLinkHref(href: string): boolean {
	try {
		return SAFE_LINK_PROTOCOLS.has(new URL(href.trim()).protocol);
	} catch {
		return false;
	}
}
