import { createFileRoute } from "@tanstack/react-router";
import { openapi } from "@/lib/openapi";

// Hop-by-hop / proxy-added headers. fumadocs' proxy copies every inbound header onto its outbound `fetch`, and undici
// rejects several of these (`Connection: upgrade`, `Keep-Alive`, `Upgrade`, `Transfer-Encoding`, `Expect`) with
// "fetch failed" — so a load balancer adding one turns every playground request into a 500. They describe the inbound
// hop, not the upstream one, so they must not be forwarded. (`x-forwarded-*` is matched by prefix below.)
const STRIPPED_HEADERS = new Set([
	"connection",
	"keep-alive",
	"upgrade",
	"transfer-encoding",
	"te",
	"trailer",
	"proxy-authenticate",
	"proxy-authorization",
	"expect",
	"host",
	"forwarded",
	"x-real-ip",
]);

const proxy = openapi.createProxy({
	// Sayr's public API domain — the ONLY origin this proxy is allowed to forward to.
	allowedOrigins: ["https://api.sayr.io"],
	overrides: {
		request: (proxied) => {
			for (const name of [...proxied.headers.keys()]) {
				if (STRIPPED_HEADERS.has(name) || name.startsWith("x-forwarded-")) proxied.headers.delete(name);
			}
			return proxied;
		},
	},
});

export const Route = createFileRoute("/api/openapi-proxy")({
	server: {
		handlers: {
			GET: ({ request }) => proxy.GET(request),
			HEAD: ({ request }) => proxy.HEAD(request),
			PUT: ({ request }) => proxy.PUT(request),
			POST: ({ request }) => proxy.POST(request),
			PATCH: ({ request }) => proxy.PATCH(request),
			DELETE: ({ request }) => proxy.DELETE(request),
		},
	},
});
