import { createFileRoute } from "@tanstack/react-router";
import * as Sentry from "@sentry/tanstackstart-react";

export const Route = createFileRoute("/api/sentry-example")({
	server: {
		handlers: {
			GET: () => {
				// Send a test metric before throwing error
				if (process.env.VITE_SENTRY_DSN) {
					Sentry.metrics.gauge("api_error_test", 1);
					Sentry.metrics.distribution("api_response_time", 150);
				}

				throw new Error("Sentry Example Route Error");
				// biome-ignore lint/correctness/noUnreachable: This is intentional for testing
				return new Response(JSON.stringify({ message: "Testing Sentry Error..." }), {
					headers: {
						"Content-Type": "application/json",
					},
				});
			},
		},
	},
});
