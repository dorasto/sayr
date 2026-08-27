export const docsRoute = "/docs";

export function encodeMarkdownUrl(slugs: string[], locale?: string) {
	const segments = [...slugs];
	if (segments.length === 0) {
		segments.push("index.md");
	} else {
		segments[segments.length - 1] += ".md";
	}

	return `/${[locale, ...docsRoute.split("/"), ...segments].filter(Boolean).join("/")}`;
}

/** @returns page slugs */
export function decodeMarkdownUrl(segments: string[]) {
	if (segments.length === 0) return [];

	const out = [...segments];
	const last = out.pop();
	if (last) out.push(last.replace(/\.md$/, ""));
	if (out.length === 1 && out[0] === "index") out.pop();
	return out;
}
