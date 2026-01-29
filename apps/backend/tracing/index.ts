import {
	context,
	trace,
	propagation,
	SpanKind,
	SpanStatusCode,
} from "@opentelemetry/api";
import type { Context, Next } from "hono";
import { getTracer } from "@repo/opentelemetry";

export function rootSpanPlugin() {
	return async (c: Context, next: Next) => {
		const tracer = getTracer();

		// Extract trace context from incoming headers
		const headers: Record<string, string> = {};
		c.req.raw.headers.forEach((value, key) => {
			headers[key] = value;
		});

		const parentCtx = propagation.extract(context.active(), headers);

		const span = tracer.startSpan(
			`${c.req.method} ${c.req.path}`,
			{
				kind: SpanKind.SERVER,
				attributes: {
					"http.request.method": c.req.method,
					"url.path": c.req.path,
					"user_agent.original":
						c.req.header("user-agent") ?? "unknown",
				},
			},
			parentCtx
		);

		const spanCtx = trace.setSpan(parentCtx, span);
		const traceId = span.spanContext().traceId;

		// Expose trace ID to the client
		c.header("x-trace-id", traceId);

		try {
			await context.with(spanCtx, async () => {
				await next();
			});

			span.setAttribute(
				"http.response.status_code",
				c.res.status
			);

			if (c.res.status >= 500) {
				span.setStatus({ code: SpanStatusCode.ERROR });
			} else {
				span.setStatus({ code: SpanStatusCode.OK });
			}
		} catch (err) {
			span.setAttribute(
				"http.response.status_code",
				c.res?.status ?? 500
			);
			span.recordException(err as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw err;
		} finally {
			span.end();
		}
	};
}