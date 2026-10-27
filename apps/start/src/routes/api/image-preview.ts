import { createFileRoute } from "@tanstack/react-router";
import { readCappedBody, safeFetch } from "@/lib/safe-fetch";

/** Cap on bytes read from the target page before parsing — metadata lives in <head>. */
const MAX_PREVIEW_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

// Linear-time patterns: match whole tags first (each scan stops at the next "<"), then parse
// attributes per tag with a bounded attribute-name length. Oversized tags are skipped.
const TITLE_REGEX = /<title\b[^<>]*>([^<]*)<\/title>/i;
const META_TAG_REGEX = /<meta\b[^<>]*>/gi;
const ATTR_REGEX = /([a-zA-Z_:][-a-zA-Z0-9_:.]{0,63})\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const MAX_META_TAG_LENGTH = 4096;

/** Collects `<meta>` tags into a map of (property|name) → content. First occurrence wins. */
function parseMetaTags(html: string): Map<string, string> {
	const meta = new Map<string, string>();
	for (const tag of html.match(META_TAG_REGEX) ?? []) {
		if (tag.length > MAX_META_TAG_LENGTH) continue;
		const attrs = new Map<string, string>();
		for (const m of tag.matchAll(ATTR_REGEX)) {
			const name = m[1]?.toLowerCase();
			if (name) attrs.set(name, m[2] ?? m[3] ?? m[4] ?? "");
		}
		const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase();
		const content = attrs.get("content");
		if (key && content && !meta.has(key)) meta.set(key, content);
	}
	return meta;
}

async function fetchPreview(url: string) {
	try {
		const response = await safeFetch(url, {
			headers: {
				"User-Agent": "Sayr/1.0",
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});

		if (!response) {
			throw new Error("Blocked or invalid URL");
		}

		if (!response.ok) {
			await response.body?.cancel();
			throw new Error(`Failed to fetch: ${response.statusText}`);
		}

		const data = new TextDecoder().decode(await readCappedBody(response, MAX_PREVIEW_BYTES));
		const meta = parseMetaTags(data);
		const titleMatch = data.match(TITLE_REGEX);

		return {
			title: meta.get("og:title") ?? titleMatch?.at(1) ?? null,
			description: meta.get("og:description") ?? meta.get("description") ?? null,
			image: meta.get("og:image") ?? null,
			url: meta.get("og:url") ?? url,
		};
	} catch (error) {
		console.error("Error fetching preview:", error);
		return {
			title: null,
			description: null,
			image: null,
			url,
		};
	}
}

export const Route = createFileRoute("/api/image-preview")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url).searchParams.get("url");

				if (!url) {
					return Response.json({ error: "URL parameter is required" }, { status: 400 });
				}

				try {
					const metadata = await fetchPreview(url);
					return Response.json(metadata);
				} catch (_error) {
					return Response.json({ error: "Failed to fetch preview" }, { status: 500 });
				}
			},
		},
	},
});
