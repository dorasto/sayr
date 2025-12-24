import { hostname } from "os";
import type { Context, Next } from "hono";

export type WideEventSender = (event: Record<string, unknown>) => Promise<void> | void;

export interface WideEventOptions {
	// Optional override function to send the event (default = POST to AXIOM_BACKEND_OTEL_* env)
	sendEvent?: WideEventSender;
	// Automatically include request method, path, service, etc.
	serviceName?: string;
}

export function wideEventMiddleware(opts: WideEventOptions = {}): (c: Context, next: Next) => Promise<void> {
	const { sendEvent = defaultAxiomSend, serviceName = "sayr-backend-service" } = opts;

	return async (c, next) => {
		const start = Date.now();

		// We'll let handlers attach app-specific fields to the event
		const event: Record<string, unknown> = {
			request_id: c.get("requestId"),
			timestamp: new Date().toISOString(),
			method: c.req.method,
			path: c.req.path,
			service: serviceName,
			name: "sayr_backend_custom_event",
			environment: process.env.NODE_ENV || "development",
			description: "",
			context: {
				ip: c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip"),
				user_agent: c.req.header("user-agent"),
				host: c.req.header("host"),
				referer: c.req.header("referer"),
				origin: c.req.header("origin"),
				content_type: c.req.header("content-type"),
				url: c.req.url,
				query: Object.fromEntries(Object.entries(c.req.query())), // safe lightweight version
			},
			metadata: {
				env: process.env.NODE_ENV,
				region: process.env.REGION,
				deployment_id: process.env.DEPLOYMENT_ID,
				version: process.env.SERVICE_VERSION,
				runtime: `bun-${Bun.version}`,
				pid: process.pid,
				memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
				uptime_s: Math.floor(process.uptime()),
				hostname: process.env.HOSTNAME ?? hostname(),
				platform: process.platform,
				arch: process.arch,
				heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
			},
		};

		// Allow downstream handlers to enrich data
		c.set("wideEvent", event);

		try {
			await next();
			event.status_code = c.res.status;
			event.outcome = c.res.status && c.res.status < 500 ? "success" : "error";
		} catch (err) {
			event.status_code = 500;
			event.outcome = "error";
			event.error = serializeError(err);
			throw err;
		} finally {
			event.duration_ms = Date.now() - start;

			// Send asynchronously
			queueMicrotask(async () => {
				try {
					await sendEvent(event);
				} catch (err) {
					console.error("Failed to send wide event:", (err as Error).message);
				}
			});
		}
	};
}

// Default behaviour: POST to Axiom
async function defaultAxiomSend(event: Record<string, unknown>) {
	const domain = process.env.AXIOM_BACKEND_OTEL_DOMAIN;
	const token = process.env.AXIOM_BACKEND_OTEL_TOKEN;
	const dataset = process.env.AXIOM_BACKEND_OTEL_DATASET;

	if (!domain || !token || !dataset) {
		console.warn("Axiom env vars not set — skipping event send");
		return;
	}

	await fetch(`https://${domain}/api/v1/datasets/${dataset}/ingest`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify([event]),
		keepalive: true,
	});
}

// Converts thrown errors to safe serializable form
function serializeError(error: unknown) {
	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
			// biome-ignore lint/suspicious/noExplicitAny: <any>
			code: (error as any).code,
			...Object.fromEntries(
				// biome-ignore lint/suspicious/noExplicitAny: <any>
				Object.entries(error as any).filter(([k]) => typeof k === "string")
			),
		};
	}
	return { message: String(error) };
}
