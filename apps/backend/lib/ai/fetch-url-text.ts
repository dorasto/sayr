import { JSDOM } from "jsdom";

const FETCH_TIMEOUT_MS = 8_000;
/** Cap on raw response bytes read — protects against huge/streaming responses. */
const MAX_RESPONSE_BYTES = 2_000_000;
/** Cap on extracted text length passed into the prompt — keeps token usage bounded. */
const MAX_TEXT_LENGTH = 8_000;

/**
 * Fetches a URL server-side and extracts its readable text content, replacing
 * the Mistral-only `document_url` chunk approach (see @repo/ai's text.ts):
 * this works identically regardless of which model/provider is selected,
 * since it's just plain text folded into the prompt rather than a
 * provider-specific content type.
 *
 * Returns null on any failure (timeout, non-HTML response, network error) so
 * the caller can skip that URL gracefully rather than fail the whole request.
 */
export async function fetchUrlAsText(url: string): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: { "User-Agent": "Mozilla/5.0 (compatible; SayrBot/1.0; +https://sayr.io)" },
		});
		if (!res.ok) return null;

		const contentType = res.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
			return null;
		}

		const buffer = await res.arrayBuffer();
		if (buffer.byteLength > MAX_RESPONSE_BYTES) return null;
		const html = new TextDecoder().decode(buffer.slice(0, MAX_RESPONSE_BYTES));

		const dom = new JSDOM(html);
		const { document } = dom.window;
		for (const el of document.querySelectorAll("script, style, noscript")) {
			el.remove();
		}

		const text = (document.body?.textContent ?? "").replace(/\s+/g, " ").trim();
		if (!text) return null;

		return text.slice(0, MAX_TEXT_LENGTH);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
