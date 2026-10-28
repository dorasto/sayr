// Server-only SSRF guard for routes that fetch user-supplied URLs (/api/image-preview, /api/og).
// The private-IP check mirrors apps/backend/lib/ai/fetch-url-text.ts — copied rather than imported
// because it isn't exported from a shared package.
import dns from "node:dns/promises";
import net from "node:net";

/** Redirects are validated and followed manually, up to this many hops. */
const MAX_REDIRECTS = 3;

/**
 * True when `ip` falls in a private, loopback, link-local, or otherwise non-public range
 * (RFC 1918, RFC 4193, RFC 3927, CGNAT, cloud metadata, multicast/reserved).
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
			return true;
		}
		return false;
	}
	return true; // unrecognizable — treat as unsafe
}

/** Resolves `hostname` and confirms every A/AAAA record is a public address. */
async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
	// URL.hostname wraps IPv6 literals in brackets.
	const host = hostname.replace(/^\[|\]$/g, "");
	if (net.isIP(host)) {
		return !isNonPublicIp(host);
	}
	try {
		const records = await dns.lookup(host, { all: true, verbatim: true });
		if (records.length === 0) return false;
		return records.every((r) => !isNonPublicIp(r.address));
	} catch {
		return false;
	}
}

/**
 * Parses `url`, requiring http(s) and a hostname that resolves publicly — unless the URL's
 * origin is in `trustedOrigins` (e.g. our own files CDN, which may be on an internal network
 * in self-hosted setups).
 */
async function isSafeUrl(url: string, trustedOrigins: string[]): Promise<boolean> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
	if (trustedOrigins.includes(parsed.origin)) return true;
	return resolvesToPublicAddress(parsed.hostname);
}

/**
 * Fetches a user-supplied URL with SSRF protection: only http(s), every hop (including
 * redirects, followed manually up to MAX_REDIRECTS) must resolve to a public address.
 * Returns null when the target is blocked or the redirect chain is invalid.
 */
export async function safeFetch(
	url: string,
	init: { headers?: Record<string, string>; signal?: AbortSignal; trustedOrigins?: string[] } = {}
): Promise<Response | null> {
	const trustedOrigins = init.trustedOrigins ?? [];
	let currentUrl = url;

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!(await isSafeUrl(currentUrl, trustedOrigins))) return null;

		const res = await fetch(currentUrl, {
			headers: init.headers,
			signal: init.signal,
			redirect: "manual",
		});

		if (res.status >= 300 && res.status < 400) {
			const location = res.headers.get("location");
			await res.body?.cancel();
			if (!location) return null;
			currentUrl = new URL(location, currentUrl).toString();
			continue;
		}
		return res;
	}
	return null;
}

/**
 * Reads at most `maxBytes` of a response body, cancelling the stream once the cap is hit.
 */
export async function readCappedBody(res: Response, maxBytes: number): Promise<Uint8Array> {
	const body = res.body;
	if (!body) return new Uint8Array(0);
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (total < maxBytes) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			chunks.push(value);
			total += value.byteLength;
		}
	}
	if (total >= maxBytes) {
		await reader.cancel();
	}
	const out = new Uint8Array(Math.min(total, maxBytes));
	let offset = 0;
	for (const chunk of chunks) {
		const remaining = out.length - offset;
		if (remaining <= 0) break;
		out.set(chunk.subarray(0, remaining), offset);
		offset += Math.min(chunk.byteLength, remaining);
	}
	return out;
}
