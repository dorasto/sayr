import dns from "node:dns/promises";
import net from "node:net";
import { JSDOM } from "jsdom";

const FETCH_TIMEOUT_MS = 8_000;
/** Cap on raw response bytes read — protects against huge/streaming responses. */
const MAX_RESPONSE_BYTES = 2_000_000;
/** Cap on extracted text length passed into the prompt — keeps token usage bounded. */
const MAX_TEXT_LENGTH = 8_000;
/** Redirects are validated and followed manually, up to this many hops. */
const MAX_REDIRECTS = 3;

/**
 * True when `ip` falls in a private, loopback, link-local, or otherwise
 * non-public range (RFC 1918, RFC 4193, RFC 3927, etc). Used to block SSRF
 * via task-description/comment URLs that get fetched server-side — an org
 * member could otherwise point this at the deployment's internal network
 * (redis, clickhouse, cloud metadata endpoints, etc).
 */
function isNonPublicIp(ip: string): boolean {
	if (net.isIPv4(ip)) {
		const parts = ip.split(".").map(Number);
		const a = parts[0] ?? 0;
		const b = parts[1] ?? 0;
		if (a === 0) return true; // "this" network
		if (a === 10) return true; // 10.0.0.0/8
		if (a === 127) return true; // loopback
		if (a === 169 && b === 254) return true; // link-local / cloud metadata
		if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
		if (a === 192 && b === 168) return true; // 192.168.0.0/16
		if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
		if (a >= 224) return true; // multicast + reserved
		return false;
	}
	if (net.isIPv6(ip)) {
		const lower = ip.toLowerCase();
		if (lower === "::1" || lower === "::") return true;
		if (lower.startsWith("fe80:")) return true; // link-local
		if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
		if (lower.startsWith("::ffff:")) {
			// IPv4-mapped IPv6 — validate the embedded v4 address.
			const v4 = lower.split(":").pop();
			if (v4 && net.isIPv4(v4)) return isNonPublicIp(v4);
		}
		return false;
	}
	return true; // unrecognizable — treat as unsafe
}

/** Resolves `hostname` and confirms every A/AAAA record is a public address. */
async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
	if (net.isIP(hostname)) {
		return !isNonPublicIp(hostname);
	}
	try {
		const records = await dns.lookup(hostname, { all: true, verbatim: true });
		if (records.length === 0) return false;
		return records.every((r) => !isNonPublicIp(r.address));
	} catch {
		return false;
	}
}

/** Parses `url`, requiring http(s) and a hostname that resolves publicly. */
async function isSafePublicUrl(url: string): Promise<boolean> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
	return resolvesToPublicAddress(parsed.hostname);
}

/**
 * Fetches a URL server-side and extracts its readable text content, replacing
 * the Mistral-only `document_url` chunk approach (see @repo/ai's text.ts):
 * this works identically regardless of which model/provider is selected,
 * since it's just plain text folded into the prompt rather than a
 * provider-specific content type.
 *
 * Rejects loopback/private-network/link-local targets (and any redirect that
 * lands on one) before issuing the request — these URLs come from task
 * descriptions and comments, i.e. untrusted input from any org member with
 * write access, so following them blindly is a server-side request forgery
 * vector against the deployment's internal network.
 *
 * Returns null on any failure (timeout, non-HTML response, network error,
 * blocked target) so the caller can skip that URL gracefully rather than
 * fail the whole request.
 */
export async function fetchUrlAsText(url: string): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		let currentUrl = url;
		let res: Response | undefined;

		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			if (!(await isSafePublicUrl(currentUrl))) return null;

			res = await fetch(currentUrl, {
				signal: controller.signal,
				redirect: "manual",
				headers: { "User-Agent": "Mozilla/5.0 (compatible; SayrBot/1.0; +https://sayr.io)" },
			});

			if (res.status >= 300 && res.status < 400) {
				const location = res.headers.get("location");
				if (!location) return null;
				currentUrl = new URL(location, currentUrl).toString();
				continue;
			}
			break;
		}
		if (!res || !res.ok) return null;

		const contentType = res.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
			return null;
		}

		const body = res.body;
		if (!body) return null;
		const reader = body.getReader();
		const chunks: Uint8Array[] = [];
		let totalBytes = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				totalBytes += value.byteLength;
				if (totalBytes > MAX_RESPONSE_BYTES) {
					await reader.cancel();
					break;
				}
				chunks.push(value);
			}
		}
		const buffer = new Uint8Array(Math.min(totalBytes, MAX_RESPONSE_BYTES));
		let offset = 0;
		for (const chunk of chunks) {
			const remaining = buffer.length - offset;
			if (remaining <= 0) break;
			buffer.set(chunk.subarray(0, remaining), offset);
			offset += Math.min(chunk.length, remaining);
		}
		const html = new TextDecoder().decode(buffer);

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
