import { normalizeUrl } from "@repo/ui/lib/utils";
import type { NodeJSON } from "prosekit/core";
import { isSafeLinkHref } from "@/lib/portal/link-safety";

type MarkJSON = NonNullable<NodeJSON["marks"]>[number];

const SCHEME_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

/**
 * Whether a stored media `src` (image, gif, video) may be rendered: `http(s)`, `data:image/...`, or scheme-less
 * (relative) URLs. Control characters and whitespace are stripped before the scheme check, since browsers ignore
 * them when parsing (`java\tscript:` is still `javascript:`).
 */
function isSafeMediaSrc(src: string): boolean {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
	const cleaned = src.replace(/[\u0000- ]/g, "");
	if (!SCHEME_PATTERN.test(cleaned)) return true;
	if (/^data:image\//i.test(cleaned)) return true;
	return /^https?:/i.test(cleaned);
}

function isSafeMark(mark: MarkJSON): boolean {
	if (mark.type !== "link") return true;
	const href = mark.attrs?.href;
	return typeof href === "string" && isSafeLinkHref(normalizeUrl(href));
}

/**
 * Returns a copy of a ProseKit document with unsafe URLs removed, for paths that serialize stored content through the
 * schema's raw `toDOM` (SSR HTML, the comment-history diff viewer) and so bypass the React link view's own check.
 * Link marks whose href isn't `http(s)`/`mailto` (scheme-less hrefs are treated as `https://`, matching the editor) are
 * dropped, keeping their text; media `src`s that aren't `http(s)`, relative or `data:image/` are nulled.
 */
export function sanitizeDocJSON(node: NodeJSON): NodeJSON {
	const next: NodeJSON = { ...node };
	if (node.marks) {
		next.marks = node.marks.filter(isSafeMark);
	}
	const src = node.attrs?.src;
	if (typeof src === "string" && !isSafeMediaSrc(src)) {
		next.attrs = { ...node.attrs, src: null };
	}
	if (node.content) {
		next.content = node.content.map(sanitizeDocJSON);
	}
	return next;
}
