import { context, trace, propagation, SpanStatusCode } from "@opentelemetry/api";
import type { Context, Next } from "hono";
import { getTracer } from "@repo/opentelemetry";

export function rootSpanMiddleware() {
	return async (c: Context, next: Next) => {
		const tracer = getTracer();

		// Extract trace context from incoming headers (traceparent, tracestate)
		const headers: Record<string, string> = {};
		c.req.raw.headers.forEach((value, key) => {
			headers[key] = value;
		});

		const parentCtx = propagation.extract(context.active(), headers);

		// Start span with parent context (if traceparent was present, it'll be linked)
		const span = tracer.startSpan(
			`${c.req.method} ${c.req.path}`,
			undefined,
			parentCtx
		);

		const spanCtx = trace.setSpan(parentCtx, span);
		const traceId = span.spanContext().traceId;

		c.header("x-trace-id", traceId);

		const ip = getClientIP(c.req.raw);
		const userAgent = c.req.header("user-agent") ?? "unknown";

		span.setAttributes({
			"http.client_ip": ip,
			"http.user_agent": userAgent,
			"http.method": c.req.method,
			"http.route": c.req.path,
			"http.has_parent": headers["traceparent"] ? "true" : "false",
		});

		try {
			await context.with(spanCtx, next);
			span.setStatus({ code: SpanStatusCode.OK });
		} catch (e) {
			span.recordException(e as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw e;
		} finally {
			span.end();
		}
	};
}

export function getClientIP(req: Request): string {
	const cf = req.headers.get("cf-connecting-ip");
	if (cf) return cf;

	const trueClient = req.headers.get("true-client-ip");
	if (trueClient) return trueClient;

	// const xRealIP = req.headers.get("x-real-ip");
	// if (xRealIP) return xRealIP;

	const xForwardedFor = req.headers.get("x-forwarded-for");
	if (xForwardedFor)
		// Proxy chains: first IP is original client
		return xForwardedFor.split(",")[0]?.trim() || "";

	// Hono's req.raw is a Fetch Request; reaching the socket requires the adapter
	// biome-ignore lint/suspicious/noExplicitAny: <dont care>
	const raw = (req as any).raw;
	const socketAddr = raw?.socket?.remoteAddress || raw?.connection?.remoteAddress || raw?._socket?.remoteAddress;

	return socketAddr || "unknown";
}
