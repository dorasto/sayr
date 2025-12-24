import { context, trace, SpanStatusCode } from "@opentelemetry/api";
import type { Context, Next } from "hono";
import { getTracer } from "./index";

export function rootSpanMiddleware() {
	return async (c: Context, next: Next) => {
		const tracer = getTracer();
		const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);
		const spanCtx = trace.setSpan(context.active(), span);

		try {
			await context.with(spanCtx, next);
			span.setStatus({ code: SpanStatusCode.OK });
		} catch (e) {
			span.recordException(e as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw e;
		} finally {
			span.end(); // NodeSDK exporter sends this automatically
		}
	};
}
