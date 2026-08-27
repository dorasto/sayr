import { createFileRoute } from "@tanstack/react-router";
import { openapi } from "@/lib/openapi";

const proxy = openapi.createProxy({
	// Sayr's public API domain — the ONLY origin this proxy is allowed to forward to.
	allowedOrigins: ["https://api.sayr.io"],
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
